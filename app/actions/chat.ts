'use server';

import prisma from '@/lib/prisma'; // Assure-toi d'utiliser le singleton qu'on a créé !
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@supabase/ssr'; // Ajuste selon ton auth
import { cookies } from 'next/headers';

import { after } from 'next/server';
import { triggerCortexAnalysis } from './cortex-chat';

export async function sendMessage(formData: FormData) {
    const content = formData.get('content') as string;
    const receiverId = formData.get('receiverId') as string;

    if (!content || !receiverId) return;

    // 1. Récupération du vrai Sender (Toi)
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value; }, set(name, value, options) { }, remove(name, options) { } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");
    const senderId = user.id;

    // 🔒 VÉRIFICATION MILITAIRE : Ont-ils un canal ouvert ?
    const connection = await prisma.connection.findFirst({
        where: {
            status: 'ACCEPTED',
            OR: [
                { initiatorId: senderId, receiverId: receiverId },
                { initiatorId: receiverId, receiverId: senderId }
            ]
        }
    });

    if (!connection) throw new Error("Violation d'accès : Aucun canal sécurisé actif.");

    // 💾 Sauvegarde ultra-rapide
    const savedMessage = await prisma.message.create({
        data: { content, senderId, receiverId }
    });

    // 🧠 LE CORTEX : Exécution fantôme (ne bloque pas le retour client)
    after(async () => {
        await triggerCortexAnalysis(savedMessage, connection.id);
    });

    // Pas de revalidatePath ! Supabase Realtime prendra le relais côté client.
    return { success: true, messageId: savedMessage.id };
}

export async function deleteChannel(connectionId: string) {
    // 1. Récupérer la connexion pour identifier les deux utilisateurs
    const connection = await prisma.connection.findUnique({
        where: { id: connectionId },
        select: { initiatorId: true, receiverId: true }
    });

    if (!connection) throw new Error("Canal introuvable");

    // 2. Supprimer tous les messages entre les deux utilisateurs
    await prisma.message.deleteMany({
        where: {
            OR: [
                { senderId: connection.initiatorId, receiverId: connection.receiverId },
                { senderId: connection.receiverId, receiverId: connection.initiatorId }
            ]
        }
    });

    // 3. Supprimer la connexion
    await prisma.connection.delete({
        where: { id: connectionId },
    });

    // 4. Rafraîchir l'interface
    revalidatePath('/');
}

export async function getOlderMessages(receiverId: string, cursorId: string) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value; }, set() { }, remove() { } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");

    const olderMessages = await prisma.message.findMany({
        where: {
            OR: [
                { senderId: user.id, receiverId: receiverId },
                { senderId: receiverId, receiverId: user.id }
            ]
        },
        take: 50,
        skip: 1, // On saute le curseur pour ne pas avoir de message en double
        cursor: { id: cursorId },
        orderBy: { createdAt: 'desc' }
    });

    return olderMessages.reverse();
}
