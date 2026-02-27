'use server';

import prisma from '@/lib/prisma'; // Assure-toi d'utiliser le singleton qu'on a créé !
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@supabase/ssr'; // Ajuste selon ton auth
import { cookies } from 'next/headers';

export async function sendMessage(formData: FormData) {
    const content = formData.get('content') as string;
    const receiverId = formData.get('receiverId') as string;

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

    if (!content) return;

    // 2. VÉRIFICATION CRITIQUE : Le destinataire existe-t-il vraiment ?
    const receiverExists = await prisma.profile.findUnique({
        where: { id: receiverId }
    });

    if (!receiverExists) {
        console.error(`🚨 Cible introuvable : ${receiverId}`);
        throw new Error("Impossible d'envoyer le message : Le profil cible n'existe pas.");
    }

    // 3. Envoi sécurisé
    await prisma.message.create({
        data: {
            content,
            senderId,
            receiverId,
        }
    });

    revalidatePath(`/chat/${receiverId}`);
}
