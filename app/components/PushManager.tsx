'use client';

import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/app/hooks/usePushNotifications';
import { createClient } from '@/lib/supabaseBrowser';

export default function PushManager() {
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const supabase = createClient();

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
            }
        };
        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setUserId(session?.user?.id);
        });

        return () => subscription.unsubscribe();
    }, []);

    usePushNotifications(userId || null);
    return null;
}
