'use client';

import { useState } from 'react';
import { acceptConnection } from '@/app/actions/connection';
import { Check, Loader2, CheckCircle2 } from 'lucide-react';

export default function AcceptConnectionButton({ connectionId }: { connectionId: string }) {
    const [isAccepting, setIsAccepting] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);

    const handleAccept = async () => {
        setIsAccepting(true);
        const formData = new FormData();
        formData.append('connectionId', connectionId);
        await acceptConnection(formData);

        setIsAccepting(false);
        setIsAccepted(true);
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
