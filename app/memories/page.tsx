'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cryptoManager } from '@/lib/security/crypto';

function MemoriesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const profileId = searchParams.get('profileId');

    const [memories, setMemories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    // 1. Chargement des souvenirs
    useEffect(() => {
        if (!profileId) return;
        // USING SINGULAR /api/memory based on file verification
        fetch(`/api/memory?profileId=${profileId}`)
            .then(res => res.json())
            .then(data => {
                setMemories(Array.isArray(data) ? data : []);
                setLoading(false);
            });
    }, [profileId]);

    // 2. Fonction de Suppression
    const handleDelete = async (id: string) => {
        if (!confirm("Voulez-vous vraiment effacer ce souvenir définitivement ?")) return;
        setMemories(prev => prev.filter(m => m.id !== id)); // Optimiste
        await fetch(`/api/memory/delete?id=${id}`, { method: 'DELETE' });
    };

    // 3. Fonction de Modification (Start)
    const startEdit = (memory: any) => {
        setEditingId(memory.id);
        setEditContent(memory.content);
    };

    // 4. Sauvegarde de la Modification
    const saveEdit = async (id: string) => {
        // Optimiste : on met à jour l'affichage tout de suite
        setMemories(prev => prev.map(m => m.id === id ? { ...m, content: editContent } : m));
        setEditingId(null);

        await fetch('/api/memory/update', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, content: editContent })
        });
    };

    // 5. Déchiffrement à la volée
    const handleUnlock = async (id: string, encryptedContent: string) => {
        try {
            const clearText = await cryptoManager.decrypt(encryptedContent);
            // On met à jour l'affichage localement pour montrer le texte clair
            setMemories(prev => prev.map(m =>
                m.id === id ? { ...m, content: clearText, isDecrypted: true } : m
            ));
        } catch (e) {
            alert("Erreur de déchiffrement (Clé invalide ?)");
        }
    };

    if (!profileId) return <div className="p-10 text-center">Profil non identifié.</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans">
            <div className="max-w-4xl mx-auto">

                {/* EN-TÊTE */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">🧠 Cortex Manager</h1>
                        <p className="text-slate-500">Gestion de la mémoire à long terme</p>
                    </div>
                    <Link
                        href={`/dashboard?profileId=${profileId}`}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                    >
                        ← Retour au Cockpit
                    </Link>
                </div>

                {/* LISTE */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Chargement des neurones...</div>
                    ) : memories.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">Aucun souvenir trouvé. Le cerveau est vide.</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="p-4 border-b">Type</th>
                                    <th className="p-4 border-b w-full">Contenu du souvenir</th>
                                    <th className="p-4 border-b whitespace-nowrap">Date</th>
                                    <th className="p-4 border-b text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {memories.map((m) => (
                                    <tr key={m.id} className="hover:bg-slate-50 transition">

                                        {/* TYPE (Icone) */}
                                        <td className="p-4 align-top">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${m.tags?.includes('upload') ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                {m.tags?.includes('upload') ? 'DOC' : 'NOTE'}
                                            </span>
                                        </td>

                                        {/* CONTENU INTELLIGENT */}
                                        <td className="p-4 align-top">
                                            {editingId === m.id ? (
                                                <textarea
                                                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                                                    rows={3}
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                />
                                            ) : (
                                                // LOGIQUE D'AFFICHAGE SÉCURISÉ
                                                m.type === 'secret' && !m.isDecrypted ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-slate-100 p-3 rounded text-slate-400 italic text-xs border border-slate-200 w-full max-w-md">
                                                            🔒 Contenu chiffré (Illisible pour l'IA)
                                                        </div>
                                                        <button
                                                            onClick={() => handleUnlock(m.id, m.content)}
                                                            className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-200 transition font-medium"
                                                        >
                                                            Déverrouiller 🔓
                                                        </button>
                                                    </div>
                                                ) : (
                                                    // Affichage normal (ou secret déchiffré)
                                                    <p className={`whitespace-pre-wrap text-sm leading-relaxed ${m.isDecrypted ? 'text-green-700 font-medium bg-green-50 p-2 rounded' : 'text-slate-700'
                                                        }`}>
                                                        {m.content}
                                                    </p>
                                                )
                                            )}
                                        </td>

                                        {/* DATE */}
                                        <td className="p-4 align-top text-xs text-slate-400 whitespace-nowrap">
                                            {new Date(m.createdAt).toLocaleDateString()}
                                            <br />
                                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>

                                        {/* ACTIONS */}
                                        <td className="p-4 align-top text-right space-x-2">
                                            {editingId === m.id ? (
                                                <>
                                                    <button onClick={() => saveEdit(m.id)} className="text-green-600 hover:text-green-800 font-medium text-sm">Sauver</button>
                                                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600 text-sm">Annuler</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(m)} className="text-indigo-500 hover:text-indigo-700 text-sm">Éditer</button>
                                                    <button onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-600 text-sm ml-2">Supprimer</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>
        </div>
    );
}

export default function MemoriesPage() {
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <MemoriesContent />
        </Suspense>
    );
}
