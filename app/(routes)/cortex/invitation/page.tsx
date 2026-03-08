'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck, UserPlus, X } from 'lucide-react';
import { getAgentName } from '@/lib/utils';
import { getApiUrl } from '@/lib/api';
import { createClient } from '@/lib/supabaseBrowser';

function InvitationContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const oppId = searchParams.get('id');

    const [opp, setOpp] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!oppId) {
            setLoading(false);
            return;
        }
        const fetchOpp = async () => {
            try {
                const { createClient } = await import('@/lib/supabaseBrowser');
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                const headers: any = { 'Content-Type': 'application/json' };
                if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

                const res = await fetch(getApiUrl(`/api/opportunities?id=${oppId}`), { headers }).then(r => r.json());
                if (res.success && res.opportunity) {
                    setOpp(res.opportunity);
                }
            } catch (e) { console.error(e) }
            setLoading(false);
        };
        fetchOpp();
    }, [oppId]);

    const onAccept = async () => {
        if (!oppId) return;
        setActionLoading(true);
        try {
            const { createClient } = await import('@/lib/supabaseBrowser');
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const res = await fetch(getApiUrl(`/api/opportunities`), {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'acceptInvite', oppId: oppId })
            }).then(r => r.json());

            if (res.success && res.connectionId) {
                // L'opportunité contient sourceId, on peut rediriger vers le chat avec cet utilisateur
                router.push(`/chat?id=${opp.sourceId}`);
            } else {
                setActionLoading(false);
                alert("Erreur lors de l'acceptation.");
            }
        } catch (e) {
            setActionLoading(false);
            console.error(e);
        }
    };

    const onDecline = async () => {
        if (!oppId) return;
        setActionLoading(true);
        try {
            const { createClient } = await import('@/lib/supabaseBrowser');
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            await fetch(getApiUrl(`/api/opportunities`), {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'updateStatus', oppId: oppId, status: 'CANCELLED' })
            });
            router.push('/cortex');
        } catch (e) { console.error(e) }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (!oppId || !opp) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500">Invitation introuvable ou expirée</div>;

    if (opp.status !== 'INVITED') {
        return (
            <div className="min-h-screen bg-black p-6 flex flex-col items-center justify-center text-center">
                <ShieldCheck className="w-16 h-16 text-zinc-600 mb-4" />
                <h1 className="text-xl font-bold text-white uppercase tracking-widest mb-2">Canal Sécurisé</h1>
                <p className="text-zinc-400">Cette invitation a déjà été traitée (Statut: {opp.status}).</p>
                <button
                    onClick={() => router.push('/cortex')}
                    className="mt-8 text-blue-400 hover:text-blue-300 font-mono text-sm underline"
                >
                    Retour au système central
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black p-4 flex flex-col items-center justify-center font-mono">
            <div className="w-full max-w-lg border border-blue-500/30 p-8 rounded-2xl bg-zinc-950 shadow-2xl relative overflow-hidden">
                {/* Décoration cyber */}
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <UserPlus className="w-32 h-32" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <h1 className="text-blue-400 text-xs text-left uppercase tracking-widest font-bold">Protocole de Liaison Entrant</h1>
                    </div>

                    <h2 className="text-2xl text-white font-bold mb-6">RE: {opp.title || 'Nouvelle Opportunité'}</h2>

                    <div className="bg-black/80 border border-zinc-800 p-5 rounded-lg mb-8">
                        <p className="text-zinc-500 text-xs mb-2 uppercase tracking-wide">Résumé Stratégique :</p>
                        <p className="text-zinc-300 text-sm leading-relaxed italic">
                            "{opp.summary}"
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={onAccept}
                            disabled={actionLoading}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-4 rounded-xl font-bold transition-all flex justify-center items-center shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                        >
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ACCEPTER & OUVRIR LE CANAL"}
                        </button>
                        <button
                            onClick={onDecline}
                            disabled={actionLoading}
                            className="sm:w-32 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-50 text-zinc-400 p-4 rounded-xl transition-all flex justify-center items-center font-bold"
                        >
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin text-zinc-600" /> : "REFUSER"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function InvitationPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-zinc-500"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
            <InvitationContent />
        </Suspense>
    );
}
