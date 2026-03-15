import { prisma } from "@/lib/prisma";
import admin from 'firebase-admin';

// Initialisation sécurisée de Firebase Admin (s'assure qu'il n'est pas initialisé 2 fois et que les secrets sont là)
if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Gère les retours à la ligne dans la clé privée
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export async function sendCortexAlert(userId: string, title: string, body: string, data?: Record<string, string>) {
    try {
        const userProfile = await prisma.profile.findUnique({
            where: { id: userId },
            select: { fcmToken: true }
        });

        if (!userProfile || !userProfile.fcmToken) {
            console.log(`[PUSH SENDER] Abandon: Aucun Token FCM pour l'utilisateur ${userId}`);
            return { success: false, error: 'NO_TOKEN' };
        }

        const message: admin.messaging.Message = {
            notification: { title, body },
            data: data || {},
            token: userProfile.fcmToken,
        };

        const response = await admin.messaging().send(message);
        console.log(`✅ [PUSH SENDER] Tir réussi : ${response}`);
        return { success: true, messageId: response };

    } catch (error: any) {
        console.error(`❌ [PUSH SENDER] Échec du tir :`, error);
        return { success: false, error: error.message };
    }
}

export async function sendOpportunityNotif(userId: string, oppId: string, score: number, summary: string) {
    const userProfile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { fcmToken: true }
    });

    if (!userProfile?.fcmToken) return;

    const message: admin.messaging.Message = {
        notification: {
            title: `🎯 Opportunité détectée (${score}%)`,
            body: summary,
        },
        data: {
            type: 'OPPORTUNITY_DETECTED',
            opportunityId: oppId,
            url: `/cortex/opportunity/${oppId}` // Vers la page de décision
        },
        token: userProfile.fcmToken,
    };

    return await admin.messaging().send(message);
}
