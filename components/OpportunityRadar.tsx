'use client'

import { useState, useEffect } from 'react';
import { Radar, ExternalLink, Zap, Trash2 } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
// Server actions supprimées — on utilise fetch vers /api/opportunities

export default function OpportunityRadar({ profileId }: { profileId: string }) {
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    // Fonction pour lire le journal de bord
    const fetchOpps = async () => {
        if (!profileId) return;
        try {
            const { createClient: createSupabase } = await import('@/lib/supabaseBrowser');
            const supabase = createSupabase();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const res = await fetch(getApiUrl(`/api/opportunities?profileId=${profileId}`), { headers });
            const data = await res.json();
            if (data.success && data.opportunities) setOpportunities(data.opportunities);
        } catch (err) {
            console.error("Erreur de lecture :", err);
        }
    };

    // Chargement initial
    useEffect(() => {
        fetchOpps();
    }, [profileId]);

    // Fonction pour ordonner à l'IA de scanner le web MAINTENANT
    const launchScout = async () => {
        setIsScanning(true);
        try {
            const { createClient: createSupabase } = await import('@/lib/supabaseBrowser');
            const supabase = createSupabase();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            await fetch(getApiUrl('/api/opportunities'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'scout', profileId })
            });
            // Une fois le scan terminé, on recharge la liste pour voir la nouveauté
            await fetchOpps();
        } catch (err) {
            console.error("Erreur de l'Éclaireur :", err);
        }
        setIsScanning(false);
    };

    // Protocole de nettoyage
    const deleteOpportunity = async (idToDelete: string) => {
        // 1. Suppression visuelle immédiate (Optimiste) pour une interface ultra-rapide
        setOpportunities(prev => prev.filter(opp => opp.id !== idToDelete));

        // 2. Envoi de l'ordre de destruction au serveur
        try {
            const { createClient: createSupabase } = await import('@/lib/supabaseBrowser');
            const supabase = createSupabase();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            await fetch(getApiUrl('/api/opportunities'), {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ oppId: idToDelete })
            });
        } catch (err) {
            console.error("Échec de la destruction :", err);
        }
    };

    return (
        <div className="glass-panel rounded-xl p-4 flex flex-col gap-3 mt-6 shadow-2xl">

            {/* HEADER UNIFIÉ */}
            <div className="flex justify-between items-center border-b border-white/10 pb-2 mx-2">
                <h2 className="text-xs text-green-500 font-bold tracking-widest flex items-center gap-2 uppercase">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-radar animate-pulse">
                        <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"></path>
                        <path d="M4 6h.01"></path>
                        <path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"></path>
                        <path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"></path>
                        <path d="M12 18h.01"></path>
                        <path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"></path>
                        <circle cx="12" cy="12" r="2"></circle>
                        <path d="m13.41 10.59 5.66-5.66"></path>
                    </svg>
                    INTERCEPTIONS RÉSEAU
                </h2>

                {/* Bouton style "Glass" */}
                <button
                    onClick={launchScout}
                    disabled={isScanning}
                    className={`flex items-center px-3 py-1.5 rounded-lg font-bold text-[10px] tracking-wider transition uppercase ${isScanning ? 'bg-green-900/10 text-green-500/50 border border-green-500/10 cursor-not-allowed' : 'bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-500/30 shadow-[0_0_10px_rgba(22,163,74,0.2)]'}`}
                >
                    <Zap size={12} className="mr-1.5" />
                    {isScanning ? 'SCAN EN COURS...' : 'DÉPLOYER L\'ÉCLAIREUR'}
                </button>
            </div>

            {/* CONTENU UNIFIÉ */}
            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar p-2">
                {opportunities.length === 0 ? (
                    <p className="text-gray-500 italic text-[10px] tracking-wider text-center py-4 font-mono">
                        Le radar est vide. Déployez l'Éclaireur pour scanner le web mondial.
                    </p>
                ) : (
                    opportunities.map((opp) => (
                        <div key={opp.id} className="bg-black/40 p-4 rounded-xl border border-white/5 hover:border-green-500/50 hover:bg-black/60 transition flex flex-col backdrop-blur-sm">

                            {/* EN-TÊTE DE LA CARTE : Titre à gauche, Actions à droite */}
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-sm font-bold text-green-400 pr-4 drop-shadow-[0_0_8px_rgba(74,222,128,0.2)]">{opp.title}</h3>

                                {/* BLOC ACTIONS : Corbeille + Niveau */}
                                <div className="flex items-center space-x-3 shrink-0">
                                    <button
                                        onClick={() => deleteOpportunity(opp.id)}
                                        className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                        title="Détruire le rapport"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="bg-green-900/20 border border-green-500/30 text-[10px] px-2 py-1 rounded text-green-300 font-mono">
                                        LVL: {opp.priority}/10
                                    </div>
                                </div>
                            </div>

                            {/* CORPS DE LA CARTE */}
                            <p className="text-xs text-gray-300 leading-relaxed mb-4">{opp.reasoning}</p>

                            {/* LIEN D'INFILTRATION */}
                            <div className="mt-auto">
                                <a href={opp.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-[10px] font-bold text-green-500 hover:text-green-300 uppercase tracking-widest border-b border-green-500/30 pb-0.5">
                                    S'infiltrer (Source) <ExternalLink size={12} className="ml-1" />
                                </a>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
