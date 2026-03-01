'use server';

import prisma from '@/lib/prisma';

export async function saveFcmToken(profileId: string, token: string) {
    try {
        if (!profileId || !token) throw new Error("Paramètres manquants");

        await prisma.profile.update({
            where: { id: profileId },
            data: { fcmToken: token },
        });

        console.log(`✅ [BACKEND] Token FCM mis à jour pour le profil ${profileId}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ [BACKEND] Erreur sauvegarde Token FCM:`, error);
        return { success: false, error };
    }
}
