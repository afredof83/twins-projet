import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function usePushNotifications(userId?: string) {
    useEffect(() => {
        // 1. Sécurité anti-SSR absolue (on s'assure d'être sur le client et sur mobile)
        if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
            return;
        }

        const registerPush = async () => {
            try {
                // 2. Import dynamique du plugin UNIQUEMENT sur le client
                const { PushNotifications } = await import('@capacitor/push-notifications');

                // 3. Demande la permission
                let permStatus = await PushNotifications.checkPermissions();

                if (permStatus.receive === 'prompt') {
                    permStatus = await PushNotifications.requestPermissions();
                }

                if (permStatus.receive !== 'granted') {
                    console.warn('❌ [PUSH] Permission refusée par l\'utilisateur.');
                    return;
                }

                // 4. Enregistrement auprès de Firebase
                await PushNotifications.register();

                // 5. Écouteurs d'événements
                PushNotifications.addListener('registration', (token) => {
                    console.log('✅ [PUSH] Token FCM généré : ', token.value);
                });

                PushNotifications.addListener('registrationError', (error) => {
                    console.error('❌ [PUSH] Erreur d\'enregistrement : ', JSON.stringify(error));
                });

            } catch (error) {
                console.error('❌ [PUSH] Crash critique du plugin : ', error);
            }
        };

        // Petit délai de sécurité (50ms) pour laisser le Bridge Capacitor s'initialiser totalement
        setTimeout(() => {
            registerPush();
        }, 50);

    }, [userId]);
}
