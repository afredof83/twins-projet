'use client';

import { testCortexPush } from '@/app/actions/notifications';

export default function TestNotificationButton({ userId }: { userId: string }) {
    return (
        <button
            onClick={async () => {
                alert("Missile lancé ! Regarde ton téléphone.");
                await testCortexPush(userId);
            }}
            className="p-4 bg-red-600 text-white rounded-lg font-bold shadow-lg hover:bg-red-700 transition-all"
        >
            🔴 TEST ALERTE CORTEX
        </button>
    );
}
