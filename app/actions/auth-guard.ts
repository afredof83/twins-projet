// 'use server' (static build fix)

import { prisma } from '@/lib/prisma';

/**
 * ⚡ ANTIGRAVITY: AuthGuard côté client.
 * Vérifie qu'un profil existe en BDD pour l'utilisateur connecté.
 * Retourne false si le profil n'existe pas (session fantôme).
 */
export async function checkProfileExists(userId: string): Promise<boolean> {
    if (!userId) return false;
    const profile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { id: true }
    });
    return !!profile;
}
