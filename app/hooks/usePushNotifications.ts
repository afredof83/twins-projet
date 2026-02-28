import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { saveFcmToken } from '@/app/actions/notifications';

export function usePushNotifications(userId?: string) {
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

                // ÉCOUTEUR PRINCIPAL
                PushNotifications.addListener('registration', async (token) => {
                    console.log('✅ [PUSH] Token FCM généré : ', token.value);

                    // ---> LE SAUT VERS LA BDD <---
                    await saveFcmToken(userId, token.value);
                    console.log('💾 [PUSH] Token sauvegardé dans Supabase.');
                });

            } catch (error) {
                console.error('❌ [PUSH] Erreur critique : ', error);
            }
        };

        setTimeout(() => { registerPush(); }, 50);

    }, [userId]); // Le hook se relancera si le userId change (ex: connexion)
}
