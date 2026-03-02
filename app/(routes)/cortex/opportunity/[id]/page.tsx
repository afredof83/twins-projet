'use client';

import { useState, useEffect } from 'react';
import { performAudit, sendChatInvite, updateOppStatus, getOpportunity } from '@/app/actions/opportunities';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldCheck, Zap, XOctagon } from 'lucide-react';
import Link from 'next/link';

export default function OpportunityPage() {
    const params = useParams();
    const router = useRouter();
    const oppId = params.id as string;

    const [opp, setOpp] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [inviteTitle, setInviteTitle] = useState('');

    useEffect(() => {
        // Dans une vraie app, tu ferais un fetch pour récupérer l'opp depuis le serveur.
        // Puisque nous avons les Server Actions, on pourrait ajouter un getOpportunity(id) dans opportunities.ts
        // Pour l'instant, on simule le chargement pour brancher l'UI
        const fetchOpp = async () => {
            const res = await getOpportunity(oppId);
            if (res.success && res.opportunity) {
                setOpp(res.opportunity);
            }
            setLoading(false);
        };
        fetchOpp();
    }, [oppId]);

    const handleAudit = async () => {
        setActionLoading(true);
        const updated = await performAudit(oppId);
        setOpp(updated);
        setActionLoading(false);
    };

    const handleCancel = async () => {
        setActionLoading(true);
        await updateOppStatus(oppId, 'CANCELLED');
        router.push('/cortex');
    };

    const handleBlock = async () => {
        if (!confirm("Voulez-vous bloquer cet agent définitivement ?")) return;
        setActionLoading(true);
        await updateOppStatus(oppId, 'BLOCKED');
        router.push('/cortex');
    };

    const handleInvite = async () => {
        if (!inviteTitle.trim()) return alert("Veuillez saisir un titre");
        setActionLoading(true);
        await sendChatInvite(oppId, inviteTitle);
        router.push('/cortex'); // Rediriger vers le dashboard après envoi
    };

    if (loading) return <div className="p-8 text-center text-zinc-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;
    if (!opp) return <div className="p-8 text-center text-red-500">Opportunité introuvable</div>;

    // Vue Initiale : Résumé + Match %
    if (opp.status === "DETECTED") {
        return (
            <div className="max-w-xl mx-auto p-4 md:p-8 space-y-8">
                <Link href="/cortex" className="inline-flex items-center text-zinc-400 hover:text-white mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Retour au Radar
                </Link>

                <div className="p-8 rounded-2xl bg-black border border-green-500/30 text-green-500 font-mono relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Zap className="w-32 h-32" />
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <Zap className="w-8 h-8 text-green-400" />
                        <h1 className="text-2xl font-bold">MATCH DETECTÉ : {opp.matchScore}%</h1>
                    </div>

                    <p className="text-zinc-300 text-lg leading-relaxed relative z-10">{opp.summary}</p>

                    <div className="flex flex-col sm:flex-row gap-4 mt-12 relative z-10">
                        <button
                            onClick={handleAudit}
                            disabled={actionLoading}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-black font-bold py-3 px-6 rounded-lg transition-colors flex justify-center items-center"
                        >
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "LANCER AUDIT PROFOND"}
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={actionLoading}
                            className="bg-transparent hover:bg-zinc-800 border border-zinc-600 text-zinc-300 font-bold py-3 px-6 rounded-lg transition-colors uppercase"
                        >
                            Ignorer
                        </button>
                    </div>

                    <button
                        onClick={handleBlock}
                        className="mt-6 flex items-center text-xs text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-widest"
                    >
                        <XOctagon className="w-3 h-3 mr-1" /> Bloquer cet agent
                    </button>
                </div>
            </div>
        );
    }

    // Vue Audit : Audit Complet + Invitation
    if (opp.status === "AUDITED") {
        return (
            <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8">
                <Link href="/cortex" className="inline-flex items-center text-zinc-400 hover:text-white mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Retour au Radar
                </Link>

                <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-white">
                    <div className="flex items-center gap-3 border-b border-green-500/50 pb-4">
                        <ShieldCheck className="w-6 h-6 text-green-400" />
                        <h2 className="text-xl font-bold tracking-widest uppercase">Rapport d'Audit</h2>
                    </div>

                    <div className="mt-8 prose prose-invert prose-green mb-12">
                        <div className="whitespace-pre-wrap text-zinc-300 leading-relaxed font-mono text-sm mix-blend-lighten">
                            {opp.audit}
                        </div>
                    </div>

                    <div className="bg-black/50 p-6 rounded-xl border border-blue-500/20">
                        <h3 className="text-blue-400 font-bold mb-4 uppercase tracking-widest text-sm">Ouvrir un Canal Sécurisé</h3>
                        <input
                            type="text"
                            value={inviteTitle}
                            onChange={(e) => setInviteTitle(e.target.value)}
                            placeholder="Ex: Projet IA & Crypto..."
                            className="bg-zinc-900 w-full p-4 rounded-lg border border-zinc-700 text-white focus:outline-none focus:border-blue-500 mb-4 font-mono"
                        />
                        <button
                            onClick={handleInvite}
                            disabled={actionLoading || !inviteTitle.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-lg transition-colors flex justify-center items-center uppercase tracking-wider"
                        >
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Envoyer l'Invitation"}
                        </button>
                    </div>

                    <button
                        onClick={handleBlock}
                        className="mt-8 flex items-center justify-center w-full text-xs text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-widest"
                    >
                        <XOctagon className="w-3 h-3 mr-1" /> Bloquer définitivement
                    </button>
                </div>
            </div>
        );
    }

    // Vue autres états (INVITED, BLOCKED, CANCELLED)
    return (
        <div className="max-w-xl mx-auto p-4 md:p-8 text-center space-y-4">
            <h1 className="text-xl font-bold text-white uppercase">Dossier Classé</h1>
            <p className="text-zinc-400 font-mono">Statut de l'opportunité : {opp.status}</p>
            <Link href="/cortex" className="inline-block mt-8 text-blue-400 hover:text-blue-300">
                Retour au Radar
            </Link>
        </div>
    );
}
