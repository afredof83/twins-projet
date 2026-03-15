'use client';

import { useState } from 'react';
import { Target, Zap, ChevronDown, ChevronUp, BrainCircuit, Check, X, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface RadarMatchCardProps {
    opportunity: any;
    myId: string;
}

export default function RadarMatchCard({ opportunity, myId }: RadarMatchCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [auditStream, setAuditStream] = useState<string>(opportunity.audit || '');
    const [isEvaluating, setIsEvaluating] = useState(false);

    // Nouveaux états pour gérer les actions des boutons
    const [localStatus, setLocalStatus] = useState(opportunity.status);
    const [isProcessing, setIsProcessing] = useState(false);

    const isSource = opportunity.sourceProfile?.userId === myId;
    const targetProfile = isSource ? opportunity.targetProfile : opportunity.sourceProfile;

    // 1. Fonction pour l'IA (inchangée)
    const evaluateSynergy = async () => {
        if (isEvaluating) return;
        setIsEvaluating(true);
        setExpanded(true);
        setAuditStream('');

        try {
            const response = await fetch('/api/opportunities/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ opportunityId: opportunity.id }),
            });

            if (!response.body) throw new Error("Pas de flux de données");

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunkText = decoder.decode(value, { stream: true });
                setAuditStream((prev) => prev + chunkText);
            }
        } catch (error) {
            console.error("Erreur de streaming:", error);
            setAuditStream((prev) => prev + "\n\n❌ *Erreur de communication avec le Cortex IA.*");
        } finally {
            setIsEvaluating(false);
        }
    };

    // 2. 🚀 FONCTION CORRIGÉE : Avec le Token de Sécurité Supabase !
    const handleAction = async (actionType: 'sendInvite' | 'updateStatus', newStatus?: string) => {
        setIsProcessing(true);
        try {
            // 1. On récupère le badge de sécurité (Session) avant de taper à la porte de l'API
            const { createClient } = await import('@/lib/supabaseBrowser');
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            let response;
            
            if (actionType === 'sendInvite') {
                // Envoi avec les headers sécurisés
                response = await fetch('/api/connection', {
                    method: 'POST',
                    headers, // <-- LE FIX EST ICI
                    body: JSON.stringify({
                        action: 'request',
                        targetId: targetProfile.id,
                        oppId: opportunity.id
                    })
                });
            } else {
                // Refus avec les headers sécurisés
                response = await fetch('/api/opportunities', {
                    method: 'POST',
                    headers, // <-- ET ICI
                    body: JSON.stringify({
                        action: 'updateStatus',
                        oppId: opportunity.id,
                        status: newStatus
                    })
                });
            }
            
            const data = await response.json();
            if (data.success) {
                // On met à jour l'état local pour changer l'UI instantanément
                setLocalStatus(newStatus || 'INVITED');
            } else {
                console.error("Erreur lors de l'action :", data.error);
            }
        } catch (error) {
            console.error("Échec de la requête réseau :", error);
        } finally {
            setIsProcessing(false);
        }
    };
    if (!targetProfile) return null;

    // Si on a refusé, on cache complètement la carte
    if (localStatus === 'CANCELLED' || localStatus === 'REJECTED') {
        return null;
    }

    // Si on a envoyé la requête, on affiche un message de succès
    if (localStatus === 'INVITED') {
        return (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center backdrop-blur-md">
                <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h3 className="text-emerald-300 font-bold">Requête envoyée à {targetProfile.name}</h3>
                <p className="text-emerald-400/70 text-sm mt-1">En attente de son acceptation.</p>
            </div>
        );
    }

    const hasAudit = auditStream.length > 0;

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md transition-all hover:border-white/20">

            {/* En-tête */}
            <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg">
                        {targetProfile.name ? targetProfile.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">{targetProfile.name || 'Agent Inconnu'}</h3>
                        <p className="text-sm text-indigo-300 font-mono flex items-center gap-1">
                            <Target className="w-3 h-3" /> {targetProfile.primary_role || 'Rôle non spécifié'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-xs uppercase tracking-widest text-slate-400 block mb-1">Score Synergie</span>
                        <span className="text-2xl font-black text-emerald-400">{opportunity.match_score || '??'}%</span>
                    </div>
                    {expanded ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
                </div>
            </div>

            {/* Corps étendu */}
            {expanded && (
                <div className="p-5 border-t border-white/10 bg-black/20">

                    {/* Lancement Audit */}
                    {!hasAudit && !isEvaluating && (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <BrainCircuit className="w-12 h-12 text-slate-500 mb-3" />
                            <p className="text-slate-400 mb-4 text-sm max-w-sm">
                                Aucune analyse profonde n'a encore été générée. Lancer le Cortex IA pour évaluer les synergies exactes.
                            </p>
                            <button
                                onClick={(e) => { e.stopPropagation(); evaluateSynergy(); }}
                                className="flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-[0_0_15px_rgba(79,70,229,0.5)]"
                            >
                                <Zap className="w-4 h-4" /> Activer l'Audit IA
                            </button>
                        </div>
                    )}

                    {/* Audit Streaming */}
                    {(hasAudit || isEvaluating) && (
                        <div className="prose prose-invert max-w-none prose-sm font-mono text-slate-300
                            prose-headings:text-indigo-300 prose-headings:font-bold prose-headings:uppercase tracking-wide
                            prose-strong:text-emerald-400 prose-p:leading-relaxed bg-black/40 p-6 rounded-xl border border-white/5">
                            <ReactMarkdown>{auditStream}</ReactMarkdown>

                            {isEvaluating && (
                                <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-1 align-middle"></span>
                            )}
                        </div>
                    )}

                    {/* 🚀 BOUTONS D'ACTION CÂBLÉS */}
                    <div className="mt-6 flex gap-3 pt-4 border-t border-white/5">
                        <button
                            onClick={() => handleAction('sendInvite')}
                            disabled={isProcessing}
                            className="flex-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center gap-2 font-bold text-sm transition disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Envoyer une requête
                        </button>

                        <button
                            onClick={() => handleAction('updateStatus', 'CANCELLED')}
                            disabled={isProcessing}
                            title="Ignorer ce profil"
                            className="px-4 py-2 rounded-lg bg-red-500/5 text-red-400 hover:bg-red-500/10 border border-red-500/10 flex items-center justify-center transition disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}