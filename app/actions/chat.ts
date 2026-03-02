'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { after } from 'next/server';

import { adminMessaging } from '@/lib/firebase-admin';

// Le serveur reçoit DIRECTEMENT le texte déjà chiffré par le client.
export async function sendSecureMessage(senderId: string, receiverId: string, encryptedContent: string) {
    try {
        // 1. Sauvegarde du message chiffré (Le serveur ne comprend pas ce qu'il stocke)
        await prisma.message.create({
            data: {
                senderId,
                receiverId,
                content: encryptedContent, // <-- C'est du charabia AES pour le serveur
            }
        });

        // 2. Notification (optionnelle, sans le contenu)
        // Ne jamais envoyer le contenu chiffré dans le payload d'une notification push.

        revalidatePath('/chat');
        return { success: true };
    } catch (error) {
        console.error("Erreur routage message:", error);
        return { success: false, error: "Échec de la transmission sécurisée." };
    }
}

// L'ancienne fonction sendMessage conservée pour rétrocompatibilité mais nettoyée
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

    const oppConnection = await prisma.opportunity.findFirst({
        where: {
            status: 'ACCEPTED',
            OR: [
                { sourceId: senderId, targetId: receiverId },
                { sourceId: receiverId, targetId: senderId }
            ]
        }
    });

    if (!connection && !oppConnection) throw new Error("Violation d'accès : Aucun canal sécurisé actif.");

    const activeChannelId = connection?.id || oppConnection?.id || "unknown";

    // 💾 Sauvegarde directe (Le contenu arrive déjà chiffré du client)
    const savedMessage = await prisma.message.create({
        data: { content, senderId, receiverId }
    });

    // 🧠 LE BACKGROUND PROCESSING : FCM Humain
    after(async () => {
        // 1. NOTIFICATION PUSH : On réveille le destinataire (sans le contenu)

        // 2. NOTIFICATION PUSH : On réveille le destinataire (sans le contenu)
        try {
            const receiver = await prisma.profile.findUnique({
                where: { id: receiverId },
                select: { fcmToken: true }
            });

            const sender = await prisma.profile.findUnique({
                where: { id: senderId },
                select: { name: true }
            });

            if (receiver?.fcmToken) {
                const senderName = sender?.name || "Un agent";

                await adminMessaging.send({
                    token: receiver.fcmToken,
                    notification: {
                        title: "Nouveau signal Ipse",
                        body: "Un Agent vous a transmis un message chiffré.",
                    },
                    data: {
                        type: "NEW_MESSAGE",
                        chatId: senderId,
                        url: `/chat/${senderId}`
                    }
                });
                console.log(`[FCM] Notification envoyée à ${receiverId}`);
            }
        } catch (error) {
            console.error("[FCM ERROR] Échec de l'envoi de la notification humaine :", error);
        }
    });

    return { success: true, messageId: savedMessage.id };
}

export async function deleteChannel(connectionId: string) {
    try {
        const connection = await prisma.connection.findUnique({
            where: { id: connectionId },
            select: { initiatorId: true, receiverId: true }
        });

        if (!connection) {
            return { success: false, error: "Canal introuvable ou déjà supprimé." };
        }

        await prisma.message.deleteMany({
            where: {
                OR: [
                    { senderId: connection.initiatorId, receiverId: connection.receiverId },
                    { senderId: connection.receiverId, receiverId: connection.initiatorId }
                ]
            }
        });

        // 🔒 Sécurité supplementaire : on annule aussi toute opportunité liée 
        // pour empêcher l'accès via le système de rétro-compatibilité
        await prisma.opportunity.updateMany({
            where: {
                status: 'ACCEPTED',
                OR: [
                    { sourceId: connection.initiatorId, targetId: connection.receiverId },
                    { sourceId: connection.receiverId, targetId: connection.initiatorId }
                ]
            },
            data: { status: 'CANCELLED' }
        });

        await prisma.connection.delete({
            where: { id: connectionId },
        });

        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || "Erreur interne serveur" };
    }
}

// Le serveur retourne les messages tels quels (chiffrés). Le client déchiffrera.
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
        skip: 1,
        cursor: { id: cursorId },
        orderBy: { createdAt: 'desc' }
    });

    // Le serveur est aveugle : il renvoie les messages tels quels
    return olderMessages.reverse();
}
