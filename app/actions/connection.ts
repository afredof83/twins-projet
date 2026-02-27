'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Helper for auth
async function getAuthUser() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
                set(name, value, options) { },
                remove(name, options) { }
            }
        }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");
    return user;
}

export async function requestConnection(targetId: string) {
    if (!targetId) return;

    try {
        const user = await getAuthUser();
        const currentUserId = user.id;

        // Prevent self-connection
        if (currentUserId === targetId) return;

        // Vérifier si la connexion n'existe pas déjà
        const existingConnection = await prisma.connection.findFirst({
            where: {
                OR: [
                    { initiatorId: currentUserId, receiverId: targetId },
                    { initiatorId: targetId, receiverId: currentUserId }
                ]
            }
        });

        if (existingConnection) {
            console.warn("Connexion déjà existante ou en attente.");
            return;
        }

        // 1. Créer la demande de connexion
        await prisma.connection.create({
            data: {
                initiatorId: currentUserId,
                receiverId: targetId,
                status: "PENDING"
            }
        });

        // 2. Nettoyer la découverte du Radar pour cet utilisateur
        await prisma.discovery.deleteMany({
            where: {
                profileId: currentUserId,
                url: targetId
            }
        });

        revalidatePath('/');
    } catch (error) {
        console.error("Erreur requestConnection:", error);
    }
}

export async function acceptConnection(formData: FormData) {
    const connectionId = formData.get('connectionId') as string;
    if (!connectionId) return;

    try {
        const user = await getAuthUser();
        const currentUserId = user.id;

        // 1. Mettre à jour la connexion en vérifiant que le receiver est bien l'utilisateur courant
        const result = await prisma.connection.updateMany({
            where: {
                id: connectionId,
                receiverId: currentUserId,
                status: "PENDING"
            },
            data: {
                status: "ACCEPTED"
            }
        });

        if (result.count === 0) {
            console.error("Impossible d'accepter cette connexion (non trouvée ou non autorisé).");
            return;
        }

        revalidatePath('/');
    } catch (error) {
        console.error("Erreur acceptConnection:", error);
    }
}
