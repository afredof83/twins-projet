import prisma from '@/lib/prisma';
import admin from 'firebase-admin';

// Initialisation sécurisée de Firebase Admin (s'assure qu'il n'est pas initialisé 2 fois)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Gère les retours à la ligne dans la clé privée
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export async function sendCortexAlert(userId: string, title: string, body: string) {
    try {
        const userProfile = await prisma.profile.findUnique({
            where: { id: userId },
            select: { fcmToken: true }
        });

        if (!userProfile || !userProfile.fcmToken) {
            console.log(`[PUSH SENDER] Abandon: Aucun Token FCM pour l'utilisateur ${userId}`);
            return { success: false, error: 'NO_TOKEN' };
        }

        const message = {
            notification: { title, body },
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
