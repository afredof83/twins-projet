'use client';
import { useState, useEffect } from 'react';
// Server actions supprimées — on utilise fetch vers /api/opportunities
import { getAgentName } from '@/lib/utils';
import { Loader2, Zap, MessageSquare, FolderLock, Target } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuditPanel from './AuditPanel';
import { useLanguage } from '@/context/LanguageContext';

export default function RadarMatchCard({ opportunity, myId }: { opportunity: any, myId: string }) {
    const { t } = useLanguage();
    const router = useRouter();
    const [status, setStatus] = useState(opportunity.status); // DETECTED, AUDITED, etc.
    const [loading, setLoading] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditData, setAuditData] = useState(opportunity.audit);
    const [showAudit, setShowAudit] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);

    // Sync state with props
    useEffect(() => {
        setStatus(opportunity.status);
        setAuditData(opportunity.audit);
    }, [opportunity.status, opportunity.audit]);

    const hasAudit = Boolean(auditData || opportunity?.audit);

    // On détermine qui est l'autre agent
    const otherProfile = opportunity?.sourceId === myId
        ? opportunity?.targetProfile
        : opportunity?.sourceProfile;

    console.log("🔍 [RadarMatchCard] Profile data:", {
        oppId: opportunity?.id,
        myId,
        sourceId: opportunity?.sourceId,
        targetId: opportunity?.targetId,
        hasTargetProfile: !!opportunity?.targetProfile,
        hasSourceProfile: !!opportunity?.sourceProfile,
        otherId: otherProfile?.id
    });

    // --- LOGIQUE AUDIT ---
    const getOppHeaders = async () => {
        const { createClient } = await import('@/lib/supabaseBrowser');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers: any = { 'Content-Type': 'application/json' };
        if (session) headers['Authorization'] = `Bearer ${session.access_token}`;
        return headers;
    };

    const handleAudit = async () => {
        setIsAuditing(true);
        setAuditData(''); // Reset for typewriter effect
        setShowAudit(true); // Immediate UI feedback
        
        try {
            const { createClient } = await import('@/lib/supabaseBrowser');
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const response = await fetch(getApiUrl('/api/opportunities/evaluate'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ opportunityId: opportunity.id })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Streaming Error' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error('No stream reader available');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                setAuditData((prev: string) => prev + chunk);
            }

            setStatus('AUDITED');
        } catch (e: any) {
            console.error("❌ [STREAM ERROR]:", e);
            alert(`Erreur Cortex: ${e.message}`);
            setAuditData("Échec de la génération de l'audit.");
        } finally {
            setIsAuditing(false);
        }
    };

    const handleConnect = async () => {
        setLoading(true);
        const headers = await getOppHeaders();
        const res = await fetch(getApiUrl('/api/connection'), {
            method: 'POST',
            headers,
            body: JSON.stringify({ action: 'request', targetId: otherProfile?.id, oppId: opportunity.id })
        }).then(r => r.json());
        if (res.success) {
            setStatus('INVITED');
        }
        setLoading(false);
    };

    const handleAccept = async () => {
        if (!opportunity?.id || !otherProfile?.id) return;
        setLoading(true);
        const headers = await getOppHeaders();
        const res = await fetch(getApiUrl('/api/connection'), {
            method: 'POST',
            headers,
            body: JSON.stringify({ action: 'accept', oppId: opportunity.id })
        }).then(r => r.json());
        if (res.success) {
            setIsAccepted(true);
            router.push(`/chat?id=${otherProfile?.id}`);
            return; // Le composant sera démonté par la navigation, pas de setState après
        }
        setLoading(false);
    };

    return (
        <div className="b2b-card p-8 mb-6 transition-all hover:bg-zinc-900/40">
            {/* HEADER : Nom + Score */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-xl font-bold tracking-tight text-white">{getAgentName(otherProfile)}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-1 mt-1 font-mono italic">
                        {typeof (otherProfile?.bio || otherProfile?.primaryRole) === 'object'
                            ? JSON.stringify(otherProfile?.bio || otherProfile?.primaryRole)
                            : (otherProfile?.bio || otherProfile?.primaryRole || "Agent Digital Twin")}
                    </p>
                </div>
                <span className="badge-status border-blue-500/20 text-blue-400 shrink-0 ml-4">
                    {opportunity.matchScore}% {t('radar.match_score')}
                </span>
            </div>

            {/* BODY : Résumé ou Audit */}
            <div className="mb-6">
                {status === 'DETECTED' ? (
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        {(() => {
                            const val = opportunity.synergies || opportunity.summary || opportunity.content;
                            if (!val) return "Le rapport d'audit est en cours de décryptage par le Cortex...";
                            if (typeof val === 'object') return JSON.stringify(val);
                            return val;
                        })()}
                    </p>
                ) : (
                    <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
                        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold text-center">
                            {t('radar.audit_ready')}
                        </p>
                    </div>
                )}
            </div>

            {/* Rendu conditionnel des actions */}
            <div className="mt-6 space-y-3">

                {/* BOUTON AUDIT PERSISTANT (S'affiche si un audit existe déjà) */}
                {hasAudit && (
                    <button
                        onClick={() => setShowAudit(true)}
                        className="btn-outline w-full flex items-center justify-center gap-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs py-2 h-auto"
                    >
                        <Target className="w-3 h-3" />
                        {t('radar.read_audit')}
                    </button>
                )}

                {status === 'DETECTED' && !hasAudit && (
                    <button
                        disabled={isAuditing}
                        onClick={handleAudit}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {isAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-white" />}
                        {isAuditing ? "Génération par l'IA..." : t('radar.connect_btn')}
                    </button>
                )}

                {status === 'AUDITED' && !hasAudit && (
                    <button
                        onClick={() => setShowAudit(true)}
                        className="btn-outline w-full flex items-center justify-center gap-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                    >
                        <Target className="w-4 h-4" />
                        {t('radar.read_audit')}
                    </button>
                )}

                {status === 'ACCEPTED' && (
                    <Link
                        href={`/chat?id=${otherProfile?.id}`}
                        className="btn-primary w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] relative"
                    >
                        <MessageSquare className="w-4 h-4" />
                        {t('radar.join_chat')}

                        {opportunity.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[8px] font-bold items-center justify-center text-white">
                                    {opportunity.unreadCount}
                                </span>
                            </span>
                        )}
                    </Link>
                )}

                {/* --- NOUVEAU : STATUT INVITÉ --- */}
                {/* Si JE suis celui qui a envoyé l'invitation (Source) */}
                {status === 'INVITED' && opportunity.sourceId === myId && (
                    <div className="w-full bg-blue-900/20 border border-blue-500/30 p-3 rounded text-center">
                        <p className="text-blue-400 text-xs font-bold">
                            ⏳ {t('radar.invite_sent')}
                        </p>
                    </div>
                )}

                {/* Si JE suis celui qui reçoit l'invitation (Cible) */}
                {status === 'INVITED' && opportunity.targetId === myId && (
                    <div className="w-full bg-green-900/20 border border-green-500/30 p-4 rounded-xl text-center">
                        <p className="text-green-400 text-sm font-bold mb-4">
                            📩 {t('radar.channel_request')} : {typeof opportunity.title === 'object' ? JSON.stringify(opportunity.title) : (opportunity.title || t('radar.new_invite'))}
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={loading || isAccepted}
                                onClick={handleAccept}
                                className={`btn-primary flex-1 ${isAccepted ? 'bg-emerald-600/50 cursor-default text-emerald-100' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                            >
                                {loading ? t('radar.creating') : isAccepted ? `${t('radar.accepted')} ✓` : t('radar.accept').toUpperCase()}
                            </button>
                            <button
                                onClick={async () => fetch(getApiUrl('/api/opportunities'), { method: 'POST', headers: await getOppHeaders(), body: JSON.stringify({ action: 'updateStatus', oppId: opportunity?.id, status: 'CANCELLED' }) })}
                                className="btn-outline flex-1 border-red-900/50 text-red-500 hover:bg-red-900/20 hover:text-red-400"
                            >
                                {t('radar.refuse')}
                            </button>
                        </div>
                    </div>
                )}

                {status !== 'INVITED' && status !== 'DETECTED' && status !== 'ACCEPTED' && status !== 'AUDITED' && (
                    <div className="flex gap-2 mt-6">
                        <button
                            onClick={async () => fetch(getApiUrl('/api/opportunities'), { method: 'POST', headers: await getOppHeaders(), body: JSON.stringify({ action: 'updateStatus', oppId: opportunity?.id, status: 'CANCELLED' }) })}
                            className="btn-outline w-full text-zinc-400 hover:text-zinc-200"
                        >
                            {t('radar.ignore')}
                        </button>
                        <button
                            onClick={async () => fetch(getApiUrl('/api/opportunities'), { method: 'POST', headers: await getOppHeaders(), body: JSON.stringify({ action: 'updateStatus', oppId: opportunity?.id, status: 'BLOCKED' }) })}
                            className="btn-outline w-full border-transparent bg-transparent hover:bg-red-900/10 text-red-900/70 hover:text-red-500"
                        >
                            {t('radar.block')}
                        </button>
                    </div>
                )}

            </div>

            <AuditPanel
                isOpen={showAudit}
                onClose={() => setShowAudit(false)}
                auditData={auditData}
                targetName={getAgentName(otherProfile)}
                opportunityId={opportunity?.id}
                status={status}
                targetId={otherProfile?.id}
                onInviteSuccess={() => {
                    setStatus('INVITED');
                    setShowAudit(false);
                }}
            />
        </div>
    );
}
