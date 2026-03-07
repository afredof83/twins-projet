// 'use server' (static build fix)

import { prisma } from '@/lib/prisma';

/**
 * Enregistre la clé publique ECDH d'un profil dans l'annuaire Prisma.
 * Appelé une seule fois à l'inscription (ou si la clé est regénérée).
 */
export async function registerPublicKey(profileId: string, publicKeyJwk: string) {
    try {
        await prisma.profile.update({
            where: { id: profileId },
            data: { publicKey: publicKeyJwk }
        });
        return { success: true };
    } catch (error) {
        console.error("[ECDH] Erreur enregistrement clé publique:", error);
        return { success: false, error: "Échec de l'enregistrement de la clé publique." };
    }
}

/**
 * Récupère la clé publique d'un autre utilisateur pour la dérivation ECDH.
 */
export async function getPublicKey(profileId: string): Promise<string | null> {
    try {
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: { publicKey: true }
        });
        return profile?.publicKey ?? null;
    } catch (error) {
        console.error("[ECDH] Erreur récupération clé publique:", error);
        return null;
    }
}
