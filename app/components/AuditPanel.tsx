'use client';

import { useEffect } from 'react';
import { X, Target, Zap, ChevronRight, ShieldCheck, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function AuditPanel({ isOpen, onClose, auditData, targetName, opportunityId, status, targetId }: any) {
    const cleanText = (text: string) => {
        if (!text) return "";
        return text.replace(/[*#_]/g, '').replace(/---/g, '').trim();
    };

    // 🔒 SCROLL LOCK
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // Parsing sécurisé
    let synergies = "Analyse des vecteurs de croissance en cours...";
    let actions: string[] = [];

    try {
        let parsedAudit = auditData;
        if (typeof auditData === 'string') {
            if (auditData.trim().startsWith('{')) {
                parsedAudit = JSON.parse(auditData);
            }
        }
        if (parsedAudit && typeof parsedAudit === 'object') {
            synergies = parsedAudit.synergies || synergies;
            actions = parsedAudit.actions || actions;
        } else if (typeof auditData === 'string') {
            synergies = auditData;
        }
    } catch (e) {
        if (typeof auditData === 'string') {
            synergies = auditData;
        }
    }

    return (
        <div className="fixed inset-0 z-[9999] flex justify-end overflow-hidden">
            <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative w-full sm:max-w-lg h-[100dvh] bg-zinc-950 border-l border-white/5 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out">

                {/* HEADER : Toujours standard et clair */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/20">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Rapport d'Audit</span>
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            Cortex Analysis : <span className="text-zinc-500">{targetName}</span>
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                {/* BODY : Le rapport brut */}
                <div className="flex-1 overflow-y-auto p-8 flex flex-col">

                    {/* Ajout de flex-1 et flex-col pour forcer l'étirement */}
                    <section className="flex flex-col flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Target className="w-4 h-4 text-blue-400" />
                            </div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">Synthèse Stratégique</h3>
                        </div>

                        {/* La magie opère ici : flex-1 force ce fond gris à prendre tout le vide */}
                        <div className="flex-1 p-5 rounded-2xl bg-zinc-900/40 border border-white/5 leading-relaxed text-zinc-300 text-base whitespace-pre-wrap">
                            {cleanText(synergies)}
                        </div>
                    </section>

                    {actions.length > 0 && (
                        <section className="space-y-4 mt-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 rounded-lg">
                                    <Zap className="w-4 h-4 text-indigo-400" />
                                </div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">Roadmap d'Exécution</h3>
                            </div>
                            <div className="grid gap-3">
                                {actions.map((action: string, i: number) => (
                                    <div key={i} className="group flex items-start gap-4 p-4 rounded-xl bg-zinc-900/20 border border-white/5 hover:border-indigo-500/30 transition-all">
                                        <span className="flex-none w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                            0{i + 1}
                                        </span>
                                        <p className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">{action}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* mt-auto pousse le badge tout en bas s'il reste de la place */}
                    <div className="pt-10 mt-auto flex items-center justify-center">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-white/5">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Validé par le Cortex Engine v16</span>
                        </div>
                    </div>
                </div>

                {/* FOOTER : Logique de redirection propre */}
                <div className="p-6 border-t border-white/5 bg-zinc-900/20">
                    {status === 'ACCEPTED' ? (
                        <Link href={`/chat/${targetId}`} className="w-full btn-primary py-4 flex items-center justify-center gap-2 group">
                            <MessageSquare className="w-4 h-4" />
                            Rejoindre la Discussion
                        </Link>
                    ) : (
                        <Link href={`/cortex/opportunity/${opportunityId}`} className="w-full btn-primary py-4 flex items-center justify-center gap-2 group">
                            Ouvrir un Canal Sécurisé
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}