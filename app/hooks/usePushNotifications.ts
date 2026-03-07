import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { getApiUrl } from '@/lib/api-config';
import { createClient } from '@/lib/supabaseBrowser';

export const usePushNotifications = (profileId: string | null) => {
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        if (!profileId) return;

        const registerPush = async () => {
            let permStatus = await PushNotifications.checkPermissions();
            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }
            if (permStatus.receive !== 'granted') return;

            await PushNotifications.register();
        };

        const addListeners = async () => {
            await PushNotifications.addListener('registration', async (token) => {
                try {
                    const supabase = createClient();
                    const { data: { session } } = await supabase.auth.getSession();

                    const headers: any = { 'Content-Type': 'application/json' };
                    if (session) {
                        headers['Authorization'] = `Bearer ${session.access_token}`;
                    }

                    await fetch(getApiUrl('/api/notifications'), {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ profileId, token: token.value })
                    });
                } catch (error) {
                    console.error("Erreur Push:", error);
                }
            });
        };

        registerPush();
        addListeners();

        return () => { PushNotifications.removeAllListeners(); };
    }, [profileId]);
};