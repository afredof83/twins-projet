'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateMemoryAndVector } from '@/app/actions/update-memory';
import { deleteMemoryFragment } from '@/app/actions/delete-memory';
import { createClient } from '@/lib/supabaseBrowser';

type MemoryFragment = {
    id: string;
    content: string;
    similarity?: number;
    createdAt: string;
};

export default function CortexGrid({ initialFragments, userId }: { initialFragments: MemoryFragment[]; userId?: string }) {
    const router = useRouter();
    const supabase = createClient();

    // État local des fragments (synchronisé avec les props + realtime)
    const [fragments, setFragments] = useState<MemoryFragment[]>(initialFragments);
    const [deletedIds, setDeletedIds] = useState<string[]>([]);

    // Synchronisation : Si les props changent (refresh serveur), on met à jour l'état
    useEffect(() => {
        setFragments(initialFragments);
    }, [initialFragments]);

    // Filtrage souverain : on ne montre jamais un fragment blacklisté
    const visibleFragments = fragments.filter(f => !deletedIds.includes(f.id));

    // ⚡ REALTIME : Écoute les mutations sur la table memory
    useEffect(() => {
        // 1. On nomme le canal proprement
        const channel = supabase
            .channel('cortex-realtime-channel')
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'memory' },
                (payload: any) => {
                    console.log("🔥 Signal DELETE reçu :", payload);

                    // 2. RÈGLE D'OR : Utiliser le callback du setState (prev)
                    // Cela permet de mettre à jour la liste SANS mettre `fragments` dans les dépendances du useEffect
                    setFragments((prev) => prev.filter((frag) => frag.id !== payload.old.id));
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'memory' },
                (payload: any) => {
                    console.log("🟢 Signal INSERT reçu :", payload);
                    // Ajout optimiste si besoin
                    const newFrag: MemoryFragment = {
                        id: payload.new.id,
                        content: payload.new.content,
                        createdAt: payload.new.created_at
                    };
                    setFragments((prev) => [newFrag, ...prev]);
                }
            )
            .subscribe();

        // 3. Fonction de nettoyage propre
        return () => {
            supabase.removeChannel(channel);
        };
    }, []); // 4. LE VERROUILLAGE : Ce tableau DOIT être vide.

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const startEditing = (frag: MemoryFragment) => {
        setEditingId(frag.id);
        setEditContent(frag.content);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditContent('');
    };

    const handleSave = async (fragId: string) => {
        setIsSaving(true);
        try {
            const result = await updateMemoryAndVector(fragId, editContent);
            if (result.success) {
                setFragments(prev =>
                    prev.map(f => f.id === fragId ? { ...f, content: editContent } : f)
                );
                setEditingId(null);
                setEditContent('');
            } else {
                console.error('[CORTEX] Échec sauvegarde :', result.error);
            }
        } catch (err) {
            console.error('[CORTEX] Erreur inattendue :', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        // ÉTAPE 1 : Suppression visuelle immédiate et définitive
        setDeletedIds(prev => [...prev, id]);

        // ÉTAPE 2 : Action serveur en arrière-plan
        try {
            await deleteMemoryFragment(id);
            router.refresh();
        } catch (error) {
            // ÉTAPE 3 : Rollback — on retire de la blacklist pour réafficher
            setDeletedIds(prev => prev.filter(deletedId => deletedId !== id));
            alert('Erreur serveur');
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleFragments.map((frag) => (
                <div
                    key={frag.id}
                    className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-[0_0_15px_rgba(0,255,255,0.03)] hover:border-cyan-500/50 transition-all group"
                >
                    {/* ── HEADER ── */}
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-cyan-600 font-mono">
                            ID: {frag.id.slice(0, 8)}...
                        </span>
                        <div className="flex items-center gap-2">
                            {frag.similarity && (
                                <span className="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded">
                                    Match: {(frag.similarity * 100).toFixed(1)}%
                                </span>
                            )}
                            {editingId !== frag.id && (
                                <>
                                    <button
                                        onClick={() => startEditing(frag)}
                                        className="text-[10px] text-slate-600 hover:text-cyan-400
                                                   opacity-0 group-hover:opacity-100
                                                   transition-all tracking-widest font-bold
                                                   border border-slate-800 hover:border-cyan-700
                                                   px-2 py-0.5 rounded"
                                    >
                                        EDIT
                                    </button>
                                    <button
                                        onClick={() => handleDelete(frag.id)}
                                        className="text-[10px] text-red-500 hover:text-red-400
                                                   opacity-0 group-hover:opacity-100
                                                   bg-red-900/20 px-2 py-0.5 rounded
                                                   border border-red-900/50 transition-colors
                                                   uppercase tracking-widest font-bold"
                                    >
                                        PURGER
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── BODY : Vue ou Édition ── */}
                    {editingId === frag.id ? (
                        <div className="space-y-2">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full min-h-[100px] bg-black/60 border border-cyan-800/50
                                           rounded-lg p-3 text-sm text-cyan-50 font-mono
                                           outline-none focus:border-cyan-500
                                           focus:shadow-[0_0_12px_rgba(0,255,255,0.1)]
                                           transition-all resize-none leading-relaxed"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={cancelEditing}
                                    disabled={isSaving}
                                    className="text-[10px] text-slate-500 hover:text-white
                                               px-3 py-1 transition-colors disabled:opacity-40"
                                >
                                    ANNULER
                                </button>
                                <button
                                    onClick={() => handleSave(frag.id)}
                                    disabled={isSaving}
                                    className="text-[10px] font-black text-black bg-cyan-600
                                               hover:bg-cyan-500 px-4 py-1 rounded
                                               shadow-[0_0_15px_rgba(0,255,255,0.2)]
                                               hover:shadow-[0_0_25px_rgba(0,255,255,0.4)]
                                               transition-all disabled:opacity-50
                                               tracking-widest"
                                >
                                    {isSaving ? 'VECTORISATION...' : 'SAUVEGARDER'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-300 font-mono line-clamp-4 group-hover:line-clamp-none transition-all">
                            {frag.content}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}
