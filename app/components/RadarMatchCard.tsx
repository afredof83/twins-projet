'use client';
import { useState } from 'react';
import { performAudit, updateOppStatus, acceptInvite } from '@/app/actions/opportunities';
import { getAgentName } from '@/lib/utils';
import { Loader2, Zap, MessageSquare, FolderLock, Target } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuditPanel from './AuditPanel';

export default function RadarMatchCard({ opportunity, myId }: { opportunity: any, myId: string }) {
    const router = useRouter();
    const [status, setStatus] = useState(opportunity.status); // DETECTED, AUDITED, etc.
    const [loading, setLoading] = useState(false);
    const [auditData, setAuditData] = useState(opportunity.audit);
    const [showAudit, setShowAudit] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);

    // On détermine qui est l'autre agent
    const otherProfile = opportunity.sourceId === myId
        ? opportunity.targetProfile
        : opportunity.sourceProfile;

    // --- LOGIQUE AUDIT ---
    const handleAudit = async () => {
        setLoading(true);
        const res = await performAudit(opportunity.id);
        setAuditData(res.audit);
        setStatus('AUDITED');
        setShowAudit(true); // Open the panel right after auditing
        setLoading(false);
    };

    const handleAccept = async () => {
        setLoading(true);
        const res = await acceptInvite(opportunity.id);
        if (res.success) {
            setIsAccepted(true);
            router.push(`/chat/${otherProfile.id}`);
            return; // Le composant sera démonté par la navigation, pas de setState après
        }
        setLoading(false);
    };

    return (
        <div className="b2b-card p-8 mb-6">
            {/* HEADER : Nom + Score */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold tracking-tight text-white">{getAgentName(otherProfile)}</h3>
                    <p className="text-sm text-zinc-500">{otherProfile.role || "Agent"}</p>
                </div>
                <span className="badge-status border-blue-500/20 text-blue-400">
                    {opportunity.matchScore}% Match
                </span>
            </div>

            {/* BODY : Résumé ou Audit */}
            <div className="mb-8">
                {status === 'DETECTED' ? (
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        {opportunity.summary}
                    </p>
                ) : (
                    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 text-center">
                        <h4 className="text-zinc-300 text-sm font-bold uppercase tracking-widest text-center">Rapport d'Audit Stratégique Prêt</h4>
                    </div>
                )}
            </div>

            {/* Rendu conditionnel des actions (UN SEUL BOUTON PRINCIPAL PAR STATUT) */}
            <div className="mt-6">

                {status === 'DETECTED' && (
                    <button
                        disabled={loading}
                        onClick={handleAudit}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                            <>
                                <Zap className="w-4 h-4 fill-white" />
                                Lancer l'Audit Stratégique
                            </>
                        )}
                    </button>
                )}

                {status === 'AUDITED' && (
                    <button
                        onClick={() => setShowAudit(true)}
                        className="btn-outline w-full flex items-center justify-center gap-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                    >
                        <Target className="w-4 h-4" />
                        Lire l'Audit Cortex
                    </button>
                )}

                {/* --- NOUVEAU : STATUT INVITÉ --- */}
                {/* Si JE suis celui qui a envoyé l'invitation (Source) */}
                {status === 'INVITED' && opportunity.sourceId === myId && (
                    <div className="w-full bg-blue-900/20 border border-blue-500/30 p-3 rounded text-center mt-6">
                        <p className="text-blue-400 text-xs font-bold">
                            ⏳ Invitation envoyée. En attente de réponse...
                        </p>
                    </div>
                )}

                {/* Si JE suis celui qui reçoit l'invitation (Cible) */}
                {status === 'INVITED' && opportunity.targetId === myId && (
                    <div className="w-full bg-green-900/20 border border-green-500/30 p-4 rounded-xl text-center mt-6">
                        <p className="text-green-400 text-sm font-bold mb-4">
                            📩 Demande d'ouverture de canal : {opportunity.title || "Nouvelle invitation"}
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={loading || isAccepted}
                                onClick={handleAccept}
                                className={`btn-primary flex-1 ${isAccepted ? 'bg-emerald-600/50 cursor-default text-emerald-100' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                            >
                                {loading ? "CRÉATION..." : isAccepted ? "ACCEPTÉ ✓" : "ACCEPTER"}
                            </button>
                            <button
                                onClick={() => updateOppStatus(opportunity.id, 'CANCELLED')}
                                className="btn-outline flex-1 border-red-900/50 text-red-500 hover:bg-red-900/20 hover:text-red-400"
                            >
                                REFUSER
                            </button>
                        </div>
                    </div>
                )}

                {status !== 'INVITED' && status !== 'DETECTED' && status !== 'ACCEPTED' && status !== 'AUDITED' && (
                    <div className="flex gap-2 mt-6">
                        <button
                            onClick={() => updateOppStatus(opportunity.id, 'CANCELLED')}
                            className="btn-outline w-full text-zinc-400 hover:text-zinc-200"
                        >
                            IGNORER
                        </button>
                        <button
                            onClick={() => updateOppStatus(opportunity.id, 'BLOCKED')}
                            className="btn-outline w-full border-transparent bg-transparent hover:bg-red-900/10 text-red-900/70 hover:text-red-500"
                        >
                            BLOQUER
                        </button>
                    </div>
                )}

            </div>

            <AuditPanel
                isOpen={showAudit}
                onClose={() => setShowAudit(false)}
                auditData={auditData}
                targetName={getAgentName(otherProfile)}
                opportunityId={opportunity.id}
                status={status}
                targetId={otherProfile.id}
                onInviteSuccess={() => {
                    setStatus('INVITED');
                    setShowAudit(false);
                }}
            />
        </div>
    );
}
