import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { saveFcmToken } from '@/app/actions/notifications';

export function usePushNotifications(userId?: string) {
    const router = useRouter();

    useEffect(() => {
        // Si on n'a pas d'ID utilisateur, on ne fait rien (on attend qu'il soit chargé)
        if (!userId || typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
            return;
        }

        const registerPush = async () => {
            try {
                const { PushNotifications } = await import('@capacitor/push-notifications');

                let permStatus = await PushNotifications.checkPermissions();
                if (permStatus.receive === 'prompt') {
                    permStatus = await PushNotifications.requestPermissions();
                }
                if (permStatus.receive !== 'granted') {
                    return;
                }

                await PushNotifications.register();

                // ÉCOUTEUR PRINCIPAL : Réception du token
                PushNotifications.addListener('registration', async (token) => {
                    console.log('✅ [PUSH] Token FCM généré : ', token.value);
                    await saveFcmToken(userId, token.value);
                    console.log('💾 [PUSH] Token sauvegardé dans Supabase.');
                });

                // ÉCOUTEUR D'ERREUR
                PushNotifications.addListener('registrationError', (error) => {
                    console.error('❌ [PUSH] Erreur d\'enregistrement : ', JSON.stringify(error));
                });

                // NOTIFICATION REÇUE EN PREMIER PLAN
                PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    console.log('📬 [PUSH] Notification reçue (premier plan) : ', notification);
                });

                // CLIC SUR LA NOTIFICATION → DEEP LINK
                PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                    console.log('👉 [PUSH] Action détectée :', notification.actionId);

                    // Si la notification contient une URL de destination, on y va
                    const targetUrl = notification.notification?.data?.url;
                    if (targetUrl) {
                        router.push(targetUrl);
                    } else {
                        // Par défaut, on redirige vers le Cortex
                        router.push('/cortex');
                    }
                });

            } catch (error) {
                console.error('❌ [PUSH] Erreur critique : ', error);
            }
        };

        setTimeout(() => { registerPush(); }, 50);

    }, [userId, router]); // Le hook se relancera si le userId change
}
