import * as admin from 'firebase-admin';

// Initialisation Singleton pour éviter les fuites de mémoire dans Next.js
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // On gère les sauts de ligne dans la clé privée
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
        console.log('🔥 Firebase Admin initialisé avec succès.');
    } catch (error) {
        console.error('Erreur d\'initialisation Firebase Admin:', error);
    }
}

export async function sendPushNotification(token: string, title: string, body?: string) {
    try {
        const response = await admin.messaging().send({
            token: token,
            notification: {
                title: title,
                body: body || 'Cliquez pour voir les détails de cette opportunité.',
            },
            // Configuration pour réveiller l'app en arrière-plan
            android: { priority: 'high' },
            apns: { payload: { aps: { contentAvailable: true } } }
        });
        return { success: true, messageId: response };
    } catch (error) {
        console.error('❌ Erreur d\'envoi Push:', error);
        return { success: false, error };
    }
}
