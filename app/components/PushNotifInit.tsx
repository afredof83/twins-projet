'use client';

import { usePushNotifications } from '@/app/hooks/usePushNotifications';

export default function PushNotifInit({ userId }: { userId: string }) {
    usePushNotifications(userId);
    return null;
}
