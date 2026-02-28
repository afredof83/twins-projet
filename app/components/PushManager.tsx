'use client';

import { usePushNotifications } from '@/app/hooks/usePushNotifications';

export default function PushManager({ userId }: { userId?: string }) {
    usePushNotifications(userId);
    return null;
}
