'use client';
import { useState } from 'react';
import { ShieldAlert, Users, Loader2, CheckCircle, FileSearch, ShieldCheck } from 'lucide-react';

export default function GuardianFeed({ interventions, profileId, onClear, onRefresh }: any) {
    const [loading, setLoading] = useState(false);

    // Fonction pour lancer l'audit (utilisée par le bouton 'Valider l'action' du type 'match')
    const handleValidate = async (targetId: string) => {
        if (!targetId || !profileId) return;
        setLoading(true);
        try {
            // Changed to use the correct start endpoint if previously it was different, but here assumes /api/guardian/negotiate/start matches user intent
            const startRes = await fetch('/api/guardian/negotiate/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ myId: profileId, targetId })
            });
            const { negotiationId } = await startRes.json();

            if (negotiationId) {
                const processRes = await fetch('/api/guardian/negotiate/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ negotiationId })
                });

                if (processRes.ok) {
                    setLoading(false);
                    if (onRefresh) onRefresh(); // On demande au dashboard de scanner à nouveau pour voir le rapport
                }
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    // Fonction pour archiver la négociation une fois terminée
    const handleArchive = async (negotiationId: string) => {
        setLoading(true);
        try {
            const res = await fetch('/api/guardian/negotiate/archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ negotiationId })
            });

            if (res.ok) {
                onClear(); // Supprime la carte de l'écran immédiatement
                // Optionnel : force une redirection ou un rechargement des canaux
                window.location.reload();
            }
        } catch (e) {
            console.error("Erreur archivage:", e);
        } finally {
            setLoading(false);
        }
    };

    // Fonction pour bloquer un utilisateur
    const handleBlock = async (targetId: string, negotiationId: string) => {
        if (!confirm("Bannir définivement ce profil ? Il ne pourra plus être scanné.")) return;
        setLoading(true);
        try {
            await fetch('/api/guardian/negotiate/block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blockerId: profileId,
                    blockedId: targetId,
                    negotiationId   // On nettoie aussi la négo
                })
            });
            onClear();
            window.location.reload();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-6">
            {interventions.map((item: any, i: number) => (
                <div key={i} className="animate-in zoom-in duration-500">

                    {/* --- CARTE TYPE 'REPORT' (DOSSIER CONFIDENTIEL VALIDÉ) --- */}
                    {item.type === 'report' ? (
                        <div className="relative group overflow-hidden bg-green-950/20 border border-green-500/40 rounded-3xl p-6 backdrop-blur-md">
                            {/* Effet Scan holographique vert */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-green-500/20 animate-scan shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>

                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-green-500/20 rounded-2xl text-green-400 border border-green-500/30">
                                    <ShieldCheck size={28} className="animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-green-400 font-black tracking-tighter text-xl uppercase italic">
                                        {item.title}
                                    </h3>
                                    <p className="text-[10px] text-green-600 font-bold tracking-[0.2em] uppercase">
                                        Rapport d'Audit Technique de Liaison
                                    </p>
                                </div>
                            </div>

                            <div className="bg-black/60 rounded-2xl p-5 border border-green-900/30 mb-6 font-mono">
                                <p className="text-green-100/90 text-sm leading-relaxed whitespace-pre-wrap italic">
                                    {item.content}
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => handleArchive(item.id)}
                                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl uppercase text-[10px]"
                                >
                                    Archiver et Activer la Liaison
                                </button>

                                <div className="flex gap-2">
                                    <button
                                        onClick={onClear}
                                        className="flex-1 py-2 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-bold uppercase"
                                    >
                                        Plus tard (Annuler)
                                    </button>

                                    <button
                                        onClick={() => handleBlock(item.targetId, item.id)}
                                        className="flex-1 py-2 bg-red-950/20 border border-red-900/50 text-red-500 rounded-xl text-[10px] font-bold uppercase"
                                    >
                                        Bloquer ce Clone
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* --- CARTE TYPE 'MATCH' (INTERVENTION STANDARD) --- */
                        <div className="bg-slate-900/80 border border-slate-700 p-6 rounded-3xl backdrop-blur-md hover:border-cyan-500/50 transition-all">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="text-purple-400" size={18} />
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Négociation de Clone</span>
                            </div>
                            <p className="text-lg text-slate-100 font-medium leading-relaxed mb-6 italic">
                                "{item.content}"
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleValidate(item.targetId)}
                                    disabled={loading}
                                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : "Lancer l'audit profond"}
                                </button>
                                <button onClick={onClear} className="px-6 border border-slate-700 hover:bg-slate-800 text-slate-400 py-3 rounded-2xl font-bold transition-all">
                                    Ignorer
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
