'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function JournalPage() {
    const searchParams = useSearchParams();
    const profileId = searchParams.get('profileId');

    const [memories, setMemories] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isPrivate, setIsPrivate] = useState(false); // Le switch simple
    const [isLoading, setIsLoading] = useState(false);

    // --- CHARGEMENT ---
    const fetchMemories = async () => {
        const res = await fetch(`/api/memories?profileId=${profileId}`);
        const data = await res.json();
        if (data.memories) setMemories(data.memories);
    };

    useEffect(() => { if (profileId) fetchMemories(); }, [profileId]);

    // --- ÉCRITURE RAPIDE (Ex-Inception) ---
    const handleSubmit = async () => {
        if (!input.trim()) return;
        setIsLoading(true);

        try {
            await fetch('/api/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: input,
                    profileId,
                    // C'est ici que ça se joue : on envoie le tag TYPE
                    type: isPrivate ? 'PRIVATE' : 'PUBLIC'
                })
            });
            setInput('');
            fetchMemories(); // Mise à jour immédiate du flux
        } catch (e) {
            alert("Erreur");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 text-white font-sans max-w-4xl mx-auto p-4">

            {/* 1. ZONE DE SAISIE (L'Inception simplifiée) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl mb-8 relative z-10">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="À quoi pensez-vous ? (Souvenir, Info, Secret...)"
                    className="w-full bg-transparent text-lg text-white placeholder-slate-500 focus:outline-none resize-none h-20"
                />

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800">

                    {/* LE SWITCH MAGIQUE : Cadenas ou Globe */}
                    <button
                        onClick={() => setIsPrivate(!isPrivate)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition ${isPrivate
                                ? 'bg-red-900/30 text-red-400 border border-red-500/50'
                                : 'bg-green-900/30 text-green-400 border border-green-500/50'
                            }`}
                    >
                        {isPrivate ? (
                            <>🔒 STICTEMENT PRIVÉ (Intime)</>
                        ) : (
                            <>🌐 RÉSEAU (Utilisable pour Match)</>
                        )}
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={!input || isLoading}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold transition shadow-lg disabled:opacity-50"
                    >
                        {isLoading ? 'Encodage...' : 'Mémoriser'}
                    </button>
                </div>
            </div>

            {/* 2. LE FLUX (Journal) */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                <h3 className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-2">
                    Flux Neuronal ({memories.length})
                </h3>

                {memories.map((mem) => (
                    <div key={mem.id} className="group flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

                        {/* La Timeline visuelle à gauche */}
                        <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full border-2 ${mem.type === 'PRIVATE' ? 'bg-red-500 border-red-900' : 'bg-green-500 border-green-900'
                                }`}></div>
                            <div className="w-0.5 flex-1 bg-slate-800 group-last:bg-transparent my-1"></div>
                        </div>

                        {/* La Carte du souvenir */}
                        <div className="flex-1 pb-6">
                            <div className="bg-slate-900/50 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition relative">

                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs text-slate-500 font-mono">
                                        {new Date(mem.created_at).toLocaleDateString()} • {new Date(mem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {mem.type === 'PRIVATE' && <span className="text-xs text-red-500">🔒 Crypté</span>}
                                </div>

                                <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                                    {mem.content}
                                </p>

                                {/* Actions au survol */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                                    <button className="text-slate-600 hover:text-red-400 p-1">🗑️</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {memories.length === 0 && (
                    <div className="text-center py-20 text-slate-600 italic">
                        Votre journal est vide. Écrivez votre première pensée ci-dessus.
                    </div>
                )}
            </div>
        </div>
    );
}
