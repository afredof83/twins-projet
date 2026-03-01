'use client';
import { useState } from 'react';
import { performAudit, updateOppStatus, acceptInvite } from '@/app/actions/opportunities';
import { getAgentName } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RadarMatchCard({ opportunity, myId }: { opportunity: any, myId: string }) {
    const router = useRouter();
    const [status, setStatus] = useState(opportunity.status); // DETECTED, AUDITED, etc.
    const [loading, setLoading] = useState(false);
    const [auditData, setAuditData] = useState(opportunity.audit);

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
        setLoading(false);
    };

    const handleAccept = async () => {
        setLoading(true);
        const res = await acceptInvite(opportunity.id);
        if (res.success) {
            router.push(`/chat/${otherProfile.id}`);
        }
        setLoading(false);
    };

    return (
        <div className="border border-zinc-800 bg-black p-4 rounded-xl mb-4 shadow-2xl transition-all">
            {/* HEADER : Nom + Score */}
            <div className="flex justify-between items-center mb-4">
                <span className="text-zinc-500 text-xs font-mono uppercase tracking-tighter">
                    Agent: <span className="text-zinc-300">{getAgentName(otherProfile)}</span>
                </span>
                <span className="text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded border border-green-500/20 text-xs">
                    MATCH {opportunity.matchScore}%
                </span>
            </div>

            {/* BODY : Résumé ou Audit */}
            <div className="mb-6">
                {status === 'DETECTED' ? (
                    <p className="text-zinc-300 text-sm leading-relaxed italic">
                        "{opportunity.summary}"
                    </p>
                ) : (
                    <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
                        <h4 className="text-blue-400 text-xs font-bold uppercase mb-3 tracking-widest">Rapport d'Audit Profond</h4>
                        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-mono mix-blend-lighten">{auditData}</p>
                    </div>
                )}
            </div>

            {/* ACTIONS : Le workflow dynamique */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-zinc-900/50">
                {status === 'DETECTED' && (
                    <button
                        disabled={loading}
                        onClick={handleAudit}
                        className="flex-1 bg-green-600/90 text-black font-bold py-2 px-4 rounded-lg text-xs hover:bg-green-500 transition-colors flex justify-center items-center"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "LANCER L'AUDIT"}
                    </button>
                )}

                {status === 'AUDITED' && (
                    <Link
                        href={`/cortex/opportunity/${opportunity.id}`}
                        className="flex-1 bg-blue-600/90 text-white font-bold py-2 px-4 rounded-lg text-xs hover:bg-blue-500 transition-colors text-center flex justify-center items-center"
                    >
                        FORMULAIRE D'INVITATION
                    </Link>
                )}

                {/* --- NOUVEAU : STATUT INVITÉ --- */}
                {/* Si JE suis celui qui a envoyé l'invitation (Source) */}
                {status === 'INVITED' && opportunity.sourceId === myId && (
                    <div className="w-full bg-blue-900/20 border border-blue-500/30 p-3 rounded text-center">
                        <p className="text-blue-400 text-xs font-bold">
                            ⏳ Invitation envoyée. En attente de réponse...
                        </p>
                    </div>
                )}

                {/* Si JE suis celui qui reçoit l'invitation (Cible) */}
                {status === 'INVITED' && opportunity.targetId === myId && (
                    <div className="w-full bg-green-900/20 border border-green-500/30 p-3 rounded text-center">
                        <p className="text-green-400 text-sm font-bold mb-3">
                            📩 Demande d'ouverture de canal : {opportunity.title || "Nouvelle invitation"}
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={loading}
                                onClick={handleAccept}
                                className="flex-1 bg-green-600 text-black font-bold py-2 rounded text-xs hover:bg-green-500 transition"
                            >
                                {loading ? "CRÉATION..." : "ACCEPTER"}
                            </button>
                            <button
                                onClick={() => updateOppStatus(opportunity.id, 'CANCELLED')}
                                className="flex-1 border border-red-900 text-red-500 py-2 rounded text-xs hover:bg-red-900/30 transition"
                            >
                                REFUSER
                            </button>
                        </div>
                    </div>
                )}

                {status !== 'INVITED' && (
                    <>
                        <button
                            onClick={() => updateOppStatus(opportunity.id, 'CANCELLED')}
                            className="px-4 py-2 border border-zinc-700 text-zinc-500 text-xs font-bold rounded-lg hover:bg-zinc-800 hover:text-zinc-400 transition-colors"
                        >
                            IGNORER
                        </button>
                        <button
                            onClick={() => updateOppStatus(opportunity.id, 'BLOCKED')}
                            className="px-4 py-2 text-red-900/70 text-xs font-bold rounded-lg hover:text-red-500 transition-colors"
                        >
                            BLOQUER
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
