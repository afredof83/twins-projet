'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Target, Zap, ChevronRight, ShieldCheck, MessageSquare, CheckCircle2, Flame, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';
// Server action supprimée — on utilise fetch vers /api/opportunities

export default function AuditPanel({ isOpen, onClose, auditData, targetName, opportunityId, status, targetId, onInviteSuccess }: any) {
    const [mounted, setMounted] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    let synergies = "Analyse en cours...";
    let actions: string[] = [];

    // 🧠 NETTOYEUR ULTRA-AGRESSIF
    try {
        let parsedData = auditData;
        if (typeof auditData === 'string') {
            let cleanString = auditData.replace(/```json/gi, '').replace(/```/g, '').trim();
            if (cleanString.startsWith('{')) parsedData = JSON.parse(cleanString);
            else parsedData = cleanString;
        }

        if (parsedData && typeof parsedData === 'object') {
            synergies = parsedData.synergies || synergies;
            actions = parsedData.actions || actions;
        } else if (typeof parsedData === 'string') {
            synergies = parsedData.replace(/[*#_]/g, '').trim();
        }
    } catch (e) {
        if (typeof auditData === 'string') synergies = auditData.replace(/[*#_]/g, '').trim();
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end overflow-hidden">
            <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative w-full sm:max-w-lg h-[100dvh] bg-zinc-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out">

                {/* HEADER (Fixe : flex-none) */}
                <div className="flex-none p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/40">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Rapport d'Audit</span>
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            Cortex : <span className="text-zinc-400">{targetName}</span>
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-300" />
                    </button>
                </div>

                {/* BODY (Scrollable : flex-1 overflow-y-auto) */}
                {/* overscroll-contain empêche le "rebond" de la page derrière sur mobile */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                    <div className="p-6 space-y-8 pb-12"> {/* pb-12 = marge vitale pour le scroll mobile */}

                        {/* SECTION SYNERGIES (Couleur : Émeraude) */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                    <Target className="w-4 h-4 text-emerald-400" />
                                </div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400">Match Stratégique</h3>
                            </div>
                            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/5 leading-relaxed text-zinc-200 text-sm whitespace-pre-wrap shadow-inner">
                                {synergies}
                            </div>
                        </section>

                        {/* SECTION ACTIONS (Couleur : Ambre/Orange) */}
                        {actions && actions.length > 0 && (
                            <section className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                        <Flame className="w-4 h-4 text-amber-400" />
                                    </div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-amber-400">Plan d'Action (ROI)</h3>
                                </div>
                                <div className="grid gap-3">
                                    {actions.map((action: string, i: number) => (
                                        <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-zinc-900/60 to-zinc-900/20 border border-white/5">
                                            <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-sm text-zinc-300 font-medium">{action}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <div className="pt-4 flex items-center justify-center">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-white/5 shadow-sm">
                                <ShieldCheck className="w-3 h-3 text-blue-500" />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Synthèse certifiée par l'IA</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER (Fixe : flex-none) */}
                <div className="flex-none p-6 border-t border-white/5 bg-zinc-950/80 backdrop-blur-md">
                    {status === 'ACCEPTED' ? (
                        <Link href={`/chat?id=${targetId}`} className="w-full btn-primary py-4 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                            <MessageSquare className="w-4 h-4" />
                            Rejoindre la Discussion
                        </Link>
                    ) : (
                        <button
                            onClick={async () => {
                                setIsSending(true);
                                const { createClient } = await import('@/lib/supabaseBrowser');
                                const supabase = createClient();
                                const { data: { session } } = await supabase.auth.getSession();
                                const headers: any = { 'Content-Type': 'application/json' };
                                if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

                                const res = await fetch(getApiUrl('/api/opportunities'), {
                                    method: 'POST',
                                    headers,
                                    body: JSON.stringify({ action: 'sendChatInvite', oppId: opportunityId, customTitle: 'Demande de Canal Sécurisé' })
                                }).then(r => r.json());
                                setIsSending(false);
                                if (res.success) {
                                    setIsSent(true);
                                    if (onInviteSuccess) onInviteSuccess();
                                }
                            }}
                            disabled={isSending || isSent}
                            className={`w-full py-4 flex items-center justify-center gap-2 transition-all ${isSent
                                ? 'bg-emerald-600/50 text-emerald-100 cursor-default border border-emerald-500/50 rounded-xl font-bold'
                                : 'btn-primary shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                                }`}
                        >
                            {isSending && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isSent && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}

                            {isSending ? "Négociation en cours..." :
                                isSent ? "✓ Signal transmis au Gardien adverse" :
                                    "Ouvrir un Canal Sécurisé - Envoyer l'Invitation"}

                            {!isSending && !isSent && <ChevronRight className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}