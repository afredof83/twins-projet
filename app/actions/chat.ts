'use server';

import prisma from '@/lib/prisma'; // Assure-toi d'utiliser le singleton qu'on a créé !
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@supabase/ssr'; // Ajuste selon ton auth
import { cookies } from 'next/headers';

import { after } from 'next/server';
import { triggerCortexAnalysis } from './cortex-chat';

import { adminMessaging } from '@/lib/firebase-admin';

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

    // 🧠 LE BACKGROUND PROCESSING : IA + FCM Humain
    after(async () => {
        // 1. On lance le Cortex comme prévu
        await triggerCortexAnalysis(savedMessage, connection.id);

        // 2. NOUVEAU : On réveille le destinataire (Push Humain)
        try {
            const receiver = await prisma.profile.findUnique({
                where: { id: receiverId },
                select: { fcmToken: true }
            });

            // On récupère le nom de l'expéditeur pour l'affichage
            const sender = await prisma.profile.findUnique({
                where: { id: senderId },
                select: { name: true }
            });

            if (receiver?.fcmToken) {
                const senderName = sender?.name || "Un agent";
                const shortMessage = content.length > 40 ? content.substring(0, 37) + '...' : content;

                await adminMessaging.send({
                    token: receiver.fcmToken,
                    notification: {
                        title: `Nouveau message de ${senderName}`,
                        body: shortMessage,
                    },
                    data: {
                        type: "CHAT_MESSAGE",
                        senderId: senderId, // Important pour le deep-linking
                        url: `/chat/${senderId}`
                    }
                });
                console.log(`[FCM] Notification envoyée à ${receiverId}`);
            }
        } catch (error) {
            console.error("[FCM ERROR] Échec de l'envoi de la notification humaine :", error);
        }
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
