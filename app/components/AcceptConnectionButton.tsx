'use client';

import { useState } from 'react';
// Server action supprimée — on utilise fetch vers /api/connection
import { Check, Loader2, CheckCircle2 } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

export default function AcceptConnectionButton({ connectionId, onAccept }: { connectionId: string, onAccept?: () => void }) {
    const [isAccepting, setIsAccepting] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);

    const handleAccept = async () => {
        if (!connectionId) return;
        setIsAccepting(true);
        const { createClient } = await import('@/lib/supabaseBrowser');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers: any = { 'Content-Type': 'application/json' };
        if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

        await fetch(getApiUrl('/api/connection'), {
            method: 'POST',
            headers,
            body: JSON.stringify({ action: 'accept', connectionId })
        });

        setIsAccepting(false);
        setIsAccepted(true);
        if (onAccept) onAccept();
    };

    if (isAccepted) {
        return (
            <button disabled className="flex items-center gap-2 px-4 py-2 bg-emerald-900/50 text-emerald-400 rounded-lg border border-emerald-500/50 cursor-default">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Connecté</span>
            </button>
        );
    }

    return (
        <button
            onClick={handleAccept}
            disabled={isAccepting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors border border-emerald-500/30"
        >
            {isAccepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span className="text-xs font-bold uppercase tracking-wider">
                {isAccepting ? "Liaison..." : "Accepter"}
            </span>
        </button>
    );
}
