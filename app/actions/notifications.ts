'use server';

import prisma from '@/lib/prisma';
import { sendCortexAlert } from '@/lib/pushSender';

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

export async function testCortexPush(userId: string) {
    console.log("🔥 Test de tir demandé pour le user:", userId);
    return await sendCortexAlert(
        userId,
        "🔥 Système Opérationnel",
        "Le Cortex a désormais accès à votre smartphone."
    );
}
