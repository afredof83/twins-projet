'use client'

import { useState, useEffect } from 'react';
import { Radar, ExternalLink, Zap, Trash2 } from 'lucide-react';

export default function OpportunityRadar({ profileId }: { profileId: string }) {
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    // Fonction pour lire le journal de bord
    const fetchOpps = async () => {
        if (!profileId) return;
        try {
            const res = await fetch(`/api/opportunities?profileId=${profileId}`);
            const data = await res.json();
            if (data.success) setOpportunities(data.opportunities);
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
            await fetch('/api/scout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileId })
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
            await fetch('/api/opportunities', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: idToDelete })
            });
        } catch (err) {
            console.error("Échec de la destruction :", err);
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-lg mt-6">
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                    <Radar className="mr-2 text-green-500" /> INTERCEPTIONS RÉSEAU
                </h2>

                {/* LE BOUTON DE DÉPLOIEMENT TACTIQUE */}
                <button
                    onClick={launchScout}
                    disabled={isScanning}
                    className={`flex items-center px-4 py-2 rounded font-bold text-sm transition ${isScanning ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_10px_rgba(22,163,74,0.4)]'}`}
                >
                    <Zap className="mr-2" size={16} />
                    {isScanning ? 'SCAN DU WEB EN COURS...' : 'DÉPLOYER L\'ÉCLAIREUR'}
                </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {opportunities.length === 0 ? (
                    <p className="text-gray-500 italic text-sm text-center py-4">Le radar est vide. Déployez l'Éclaireur pour scanner le web mondial.</p>
                ) : (
                    opportunities.map((opp) => (
                        <div key={opp.id} className="bg-gray-800 p-4 rounded border border-gray-600 hover:border-green-500 transition flex flex-col">

                            {/* EN-TÊTE DE LA CARTE : Titre à gauche, Actions à droite */}
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-blue-400 pr-4">{opp.title}</h3>

                                {/* BLOC ACTIONS : Corbeille + Niveau (Ne se chevaucheront jamais) */}
                                <div className="flex items-center space-x-3 shrink-0">
                                    <button
                                        onClick={() => deleteOpportunity(opp.id)}
                                        className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                        title="Détruire le rapport"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <div className="bg-gray-900 border border-gray-600 text-xs px-2 py-1 rounded text-gray-300 font-mono">
                                        LVL: {opp.priority}/10
                                    </div>
                                </div>
                            </div>

                            {/* CORPS DE LA CARTE */}
                            <p className="text-sm text-gray-300 leading-relaxed">{opp.reasoning}</p>

                            {/* LIEN D'INFILTRATION */}
                            <div className="mt-4">
                                <a href={opp.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-semibold text-green-400 hover:text-green-300">
                                    S'infiltrer (Voir la source) <ExternalLink size={14} className="ml-1" />
                                </a>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
