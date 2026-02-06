'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function CortexManager() {
    const searchParams = useSearchParams();
    const profileId = searchParams.get('profileId');
    const router = useRouter(); // Pour rediriger si besoin

    const [memories, setMemories] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // --- GARDIEN DE SÉCURITÉ ---
    // Si pas d'ID, on affiche un écran de verrouillage au lieu de crasher
    if (!profileId) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
                <div className="text-6xl mb-4">🔒</div>
                <h1 className="text-2xl font-bold font-mono text-red-500 mb-2">ACCÈS REFUSÉ</h1>
                <p className="text-slate-400 mb-8 text-center max-w-md">
                    Identifiant de clone manquant. Le protocole de sécurité empêche l'accès au Cortex sans authentification biométrique (ID).
                </p>
                <button
                    onClick={() => router.push('/dashboard')} // Ou vers votre page de login
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-6 py-3 rounded-lg transition text-sm font-mono"
                >
                    RETOURNER AU SAS D'ENTRÉE
                </button>
            </div>
        );
    }

    // --- CHARGEMENT ---
    const fetchMemories = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/memories?profileId=${profileId}`);
            const data = await res.json();
            if (data.memories) setMemories(data.memories);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { if (profileId) fetchMemories(); }, [profileId]);

    // --- SUPPRESSION ---
    const handleDelete = async (id: string) => {
        if (!confirm("⚠️ ATTENTION : Cette action est irréversible.\nCe souvenir sera effacé de la mémoire du clone.")) {
            return;
        }

        try {
            const res = await fetch('/api/memories/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            const data = await res.json();

            if (data.success) {
                // Mise à jour locale (plus rapide que de tout recharger)
                setMemories(prev => prev.filter(m => m.id !== id));
            } else {
                alert("Erreur: " + data.error);
            }
        } catch (e) {
            alert("Erreur technique lors de la suppression.");
        }
    };

    // Filtrage pour la recherche
    const filteredMemories = memories.filter(m =>
        m.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8 font-sans">

            {/* HEADER TECHNIQUE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold font-mono text-purple-400 flex items-center gap-2">
                        ⚙️ CORTEX_MANAGER_V1
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Interface d'administration de la base vectorielle.
                    </p>
                </div>

                {/* STATS RAPIDES */}
                <div className="flex gap-4">
                    <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded text-center">
                        <div className="text-xl font-bold text-white">{memories.length}</div>
                        <div className="text-[10px] uppercase text-slate-500 tracking-wider">Fragments</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded text-center">
                        <div className="text-xl font-bold text-green-400">
                            {memories.filter(m => m.metadata?.type !== 'PRIVATE').length}
                        </div>
                        <div className="text-[10px] uppercase text-slate-500 tracking-wider">Publics</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded text-center">
                        <div className="text-xl font-bold text-red-400">
                            {memories.filter(m => m.metadata?.type === 'PRIVATE').length}
                        </div>
                        <div className="text-[10px] uppercase text-slate-500 tracking-wider">Privés</div>
                    </div>
                </div>
            </div>

            {/* BARRE D'OUTILS */}
            <div className="flex gap-4 mb-6">
                <input
                    type="text"
                    placeholder="🔍 Rechercher une séquence mémoire..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none font-mono text-sm"
                />
                <button
                    onClick={fetchMemories}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-4 rounded-lg transition"
                    title="Rafraîchir"
                >
                    🔄
                </button>
            </div>

            {/* TABLEAU DE DONNÉES */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-200 uppercase font-mono text-xs">
                            <tr>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4">Contenu (Raw Data)</th>
                                <th className="px-6 py-4">Date d'injection</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500 animate-pulse">
                                        Chargement des données neuronales...
                                    </td>
                                </tr>
                            ) : filteredMemories.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-slate-600 italic">
                                        Aucune donnée trouvée dans le secteur.
                                    </td>
                                </tr>
                            ) : (
                                filteredMemories.map((mem) => (
                                    <tr key={mem.id} className="hover:bg-slate-800/50 transition group">

                                        {/* COLONNE STATUT */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {mem.metadata?.type === 'PRIVATE' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-900/50">
                                                    🔒 PRIVÉ
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-900/50">
                                                    🌐 ACTIF
                                                </span>
                                            )}
                                        </td>

                                        {/* COLONNE CONTENU */}
                                        <td className="px-6 py-4">
                                            <div className="max-w-xl truncate text-slate-200 font-medium">
                                                {mem.content}
                                            </div>
                                            <div className="text-xs text-slate-600 font-mono mt-1">
                                                ID: {mem.id.slice(0, 8)}...
                                            </div>
                                        </td>

                                        {/* COLONNE DATE */}
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                                            {new Date(mem.created_at).toLocaleDateString()}
                                            <span className="text-slate-600 ml-2">
                                                {new Date(mem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>

                                        {/* COLONNE ACTION */}
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(mem.id)}
                                                className="text-slate-500 hover:text-red-500 hover:bg-red-900/20 p-2 rounded transition"
                                                title="Supprimer définitivement"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
