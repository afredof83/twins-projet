'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Target, ChevronRight, ShieldCheck, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

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

    const content = auditData || "Analyse en cours par le Cortex...";

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end overflow-hidden">
            <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative w-full sm:max-w-lg h-[100dvh] bg-zinc-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out">

                {/* HEADER */}
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

                {/* BODY */}
                <div className="flex-1 overflow-y-auto overscroll-contain bg-zinc-950/50">
                    <div className="p-6 space-y-8 pb-12">
                        
                        {/* STREAMED MARKDOWN CONTENT */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                    <Target className="w-4 h-4 text-blue-400" />
                                </div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400">Analyse de Synergie</h3>
                            </div>
                            
                            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 shadow-2xl backdrop-blur-sm">
                                <article className="prose prose-invert max-w-none text-zinc-200">
                                    <ReactMarkdown
                                        components={{
                                            p: ({node, ...props}) => <p className="text-zinc-300 text-sm leading-relaxed mb-4" {...props} />,
                                            strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />,
                                            ul: ({node, ...props}) => <ul className="space-y-2 mb-6" {...props} />,
                                            li: ({node, ...props}) => (
                                                <li className="text-sm text-zinc-400 flex items-start gap-2" {...props}>
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500/50 flex-none" />
                                                    {props.children}
                                                </li>
                                            ),
                                            h3: ({node, ...props}) => <h3 className="text-blue-400 text-base font-bold mt-6 mb-3" {...props} />,
                                        }}
                                    >
                                        {content}
                                    </ReactMarkdown>
                                    {!auditData && (
                                        <div className="flex items-center gap-3 mt-4 text-zinc-500 italic text-xs animate-pulse">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Décryptage des flux Cortex...
                                        </div>
                                    )}
                                </article>
                            </div>
                        </section>

                        <div className="pt-4 flex items-center justify-center">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-white/5 shadow-sm">
                                <ShieldCheck className="w-3 h-3 text-blue-500" />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Synthèse certifiée par l'IA Edge</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
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

                                const res = await fetch(getApiUrl('/api/connection'), {
                                    method: 'POST',
                                    headers,
                                    body: JSON.stringify({ action: 'request', targetId: targetId, oppId: opportunityId })
                                }).then(r => r.json());
                                setIsSending(false);
                                if (res.success) {
                                    setIsSent(true);
                                    if (onInviteSuccess) onInviteSuccess();
                                }
                            }}
                            disabled={isSending || isSent || !auditData}
                            className={`w-full py-4 flex items-center justify-center gap-2 transition-all ${isSent
                                ? 'bg-emerald-600/50 text-emerald-100 cursor-default border border-emerald-500/50 rounded-xl font-bold'
                                : 'btn-primary shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed'
                                }`}
                        >
                            {isSending && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isSent && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}

                            {isSending ? "Négocations..." :
                                isSent ? "✓ Signal transmis" :
                                    "Ouvrir un Canal Sécurisé"}

                            {!isSending && !isSent && <ChevronRight className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}