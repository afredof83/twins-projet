'use client';

import { useState } from 'react';
// Server action supprimée — on utilise fetch vers /api/ipse-advisor
import { Brain, Loader2 } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

export function TacticalEarpiece({
    getDecryptedContext
}: {
    getDecryptedContext: () => { id: string, clearText: string, isMe: boolean }[]
}) {
    const [advice, setAdvice] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);

    const handleCallIpse = async () => {
        setIsThinking(true);
        setAdvice(null);

        // On appelle la fonction pour générer la liste fraîche au moment du clic
        const decryptedMessages = getDecryptedContext();
        if (decryptedMessages.length === 0) {
            setAdvice("Pas assez de contexte pour analyser.");
            setIsThinking(false);
            return;
        }

        // On compile les 5 derniers messages en clair (déjà déchiffrés par l'UI)
        const context = decryptedMessages
            .slice(-5)
            .map(m => `${m.isMe ? 'MOI' : 'CIBLE'}: ${m.clearText}`)
            .join('\n');

        const { createClient } = await import('@/lib/supabaseBrowser');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers: any = { 'Content-Type': 'application/json' };
        if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

        const res = await fetch(getApiUrl('/api/ipse-advisor'), {
            method: 'POST',
            headers,
            body: JSON.stringify({ decryptedContext: context })
        }).then(r => r.json());
        if (res.success && res.advice) {
            setAdvice(res.advice);
        } else {
            setAdvice("Interférence réseau. Impossible de contacter le Cortex.");
        }
        setIsThinking(false);
    };

    return (
        <div className="mb-8 flex flex-col items-center animate-in fade-in duration-500">
            <button
                onClick={handleCallIpse}
                disabled={isThinking}
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/20 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
                {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                {isThinking ? "Ipse analyse..." : "Demander conseil à Ipse"}
            </button>

            {advice && (
                <div className="mt-4 p-5 max-w-[90%] md:max-w-[75%] bg-[var(--cortex)]/10 border border-[var(--cortex)]/30 rounded-2xl animate-in slide-in-from-top-2 shadow-lg backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[var(--cortex)]"></div>
                    <p className="text-[10px] text-[var(--cortex)] font-mono uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <Brain className="w-3 h-3" /> Signal Tactique Intercepté
                    </p>
                    <p className="text-sm md:text-base text-[var(--text-main)] italic leading-relaxed">"{advice}"</p>
                </div>
            )}
        </div>
    );
}
