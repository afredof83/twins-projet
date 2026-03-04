'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RadarPoller() {
    const router = useRouter();

    useEffect(() => {
        // Rafraîchir la page toutes les 15 secondes pour voir les nouvelles invitations
        const interval = setInterval(() => {
            router.refresh();
        }, 15000);

        return () => clearInterval(interval);
    }, [router]);

    return null;
}
