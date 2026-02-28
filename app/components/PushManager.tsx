'use client';

import { usePushNotifications } from '@/app/hooks/usePushNotifications';

export default function PushManager() {
    // Ici, on initialise l'antenne radio
    usePushNotifications();

    // Ce composant est invisible
    return null;
}
