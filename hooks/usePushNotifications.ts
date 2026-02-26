import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const usePushNotifications = (profileId: string | null) => {
    useEffect(() => {
        // On ne lance ça que si on est sur une vraie application mobile (iOS/Android)
        if (!Capacitor.isNativePlatform()) {
            console.log('Push Notifications ignorées : environnement web détecté.');
            return;
        }

        if (!profileId) return;

        const registerPush = async () => {
            // 1. Demander la permission (Affichera la popup système iOS/Android)
            let permStatus = await PushNotifications.checkPermissions();

            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }

            if (permStatus.receive !== 'granted') {
                console.warn('⚠️ Permission Push refusée par l\'utilisateur.');
                return;
            }

            // 2. Enregistrer l'appareil auprès de Google/Apple
            await PushNotifications.register();
        };

        // 3. Écouteurs d'événements
        const addListeners = async () => {
            await PushNotifications.addListener('registration', async (token) => {
                console.log('✅ Token Push reçu : ', token.value);

                // On envoie le token à notre nouvelle route API
                try {
                    const response = await fetch('/api/profile/push-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            profileId: profileId,
                            token: token.value
                        })
                    });

                    if (!response.ok) {
                        console.error("❌ Échec de la sauvegarde du token côté serveur.");
                    } else {
                        console.log("☁️ Jeton Firebase synchronisé avec la base de données.");
                    }
                } catch (error) {
                    console.error("❌ Erreur réseau lors de la synchronisation du token :", error);
                }
            });

            await PushNotifications.addListener('registrationError', (err) => {
                console.error('❌ Erreur d\'enregistrement Push : ', err.error);
            });

            await PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log('📥 Notification reçue en premier plan : ', notification);
            });
        };

        registerPush();
        addListeners();

        // Cleanup
        return () => {
            PushNotifications.removeAllListeners();
        };
    }, [profileId]);
};
