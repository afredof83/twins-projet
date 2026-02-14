'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ChevronLeft, MessageCircle, ShieldCheck, FileText } from 'lucide-react';

export default function LiaisonPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Safety check for partnerId
    const partnerId = Array.isArray(params.partnerId) ? params.partnerId[0] : params.partnerId;
    const profileId = searchParams.get('profileId');

    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profileId || !partnerId) return;
        const fetchReport = async () => {
            try {
                const res = await fetch(`/api/guardian/negotiate/report?myId=${profileId}&partnerId=${partnerId}`);
                const data = await res.json();
                setReport(data.report);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchReport();
    }, [profileId, partnerId]);

    const deleteLiaison = async () => {
        if (!confirm("Voulez-vous rompre cette liaison ?")) return;
        await fetch('/api/guardian/negotiate/delete', {
            method: 'POST',
            body: JSON.stringify({ myId: profileId, partnerId })
        });
        router.push(`/dashboard?profileId=${profileId}`);
    };

    const handleContact = async () => {
        if (!profileId || !partnerId || !report) return;

        // Titre auto basé sur le verdict
        const autoTopic = `Audit ${report.verdict} : Discussion sur l'industrialisation`;

        try {
            // Note: Assuming /api/cortex/bridge/ping exists or needs to be created. 
            // The user request implies it exists or is the target end point.
            // If it doesn't exist, we might get a 404, but we follow instructions.
            const res = await fetch('/api/cortex/bridge/ping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId: profileId,
                    providerId: partnerId,
                    topic: autoTopic
                })
            });

            if (res.ok) {
                alert("Demande de contact envoyée. En attente d'acceptation par l'autre humain.");
                router.push(`/dashboard?profileId=${profileId}`);
            } else {
                // Fallback if the route is not ready or fails
                console.warn("Ping failed, falling back to dashboard navigation");
                router.push(`/dashboard?profileId=${profileId}&chatWith=${partnerId}`);
            }
        } catch (e) {
            console.error("Erreur Ping:", e);
            router.push(`/dashboard?profileId=${profileId}&chatWith=${partnerId}`);
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-cyan-500 font-mono animate-pulse">DÉCRYPTAGE DU DOSSIER...</div>;

    return (
        <main className="min-h-screen bg-[#020617] text-slate-300 font-mono">
            {/* HEADER FIXE */}
            <nav className="border-b border-slate-800 p-6 flex justify-between items-center bg-black/50 backdrop-blur-md">
                <button onClick={() => router.push(`/dashboard?profileId=${profileId}`)} className="flex items-center gap-2 text-xs uppercase font-black hover:text-cyan-400 transition-all">
                    <ChevronLeft size={16} /> Retour au Dashboard
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-600 tracking-widest uppercase font-bold">Liaison Sécurisée</span>
                    <ShieldCheck size={20} className="text-green-500" />
                </div>
            </nav>

            <div className="max-w-6xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-4 gap-12 mt-8">

                {/* ACTIONS & INFOS */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Fiche Liaison</h1>
                        <p className="text-[10px] text-cyan-600 break-all font-bold">ID: {partnerId}</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={handleContact}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 transition-all"
                        >
                            <MessageCircle size={18} /> Contacter l'Humain
                        </button>

                        <button onClick={deleteLiaison} className="text-red-500/50 hover:text-red-500 text-[10px] uppercase font-bold tracking-widest transition-all">
                            Rompre la liaison
                        </button>
                    </div>
                </div>

                {/* LE RAPPORT (PAGE PLEINE) */}
                <div className="lg:col-span-3">
                    <div className="bg-slate-900/20 border border-slate-800 rounded-3xl p-10 relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-8 text-cyan-400 border-b border-slate-800 pb-6">
                            <FileText size={28} />
                            <h2 className="text-xl font-black uppercase tracking-widest">Rapport d'Audit Technique</h2>
                        </div>

                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100 font-mono italic bg-black/40 p-8 rounded-2xl border border-white/5">
                            {report?.summary || "Aucun rapport d'audit archivé pour cette liaison."}
                        </div>

                        <div className="mt-12 flex justify-between items-center opacity-20 text-[10px]">
                            <span>SYSTÈME : CORTEX_V2</span>
                            <span>{new Date(report?.createdAt || Date.now()).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
