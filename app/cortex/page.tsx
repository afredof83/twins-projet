'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, BrainCircuit, Sparkles, Database, Plus, Trash2, History } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { createClient } from '@/lib/supabaseBrowser';
import { useLanguage } from '@/context/LanguageContext';
import { usePrismStore, PrismType } from '@/store/prismStore';
import { usePrismData } from '@/hooks/usePrismData';

// --- Sub-components ---

function MemoryCard({ memory, onDelete }: { memory: any; onDelete: () => void }) {
    const { t } = useLanguage();
    const supabase = createClient();
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm(t('common.confirm_delete') || 'Are you sure?')) return;
        setDeleting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(getApiUrl('/api/memories'), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'deleteCortexMemory', payload: { memoryId: memory.id } })
            });
            onDelete();
        } catch (e) {
            console.error("Delete error", e);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md hover:border-[var(--primary)]/30 transition-all">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    FRAGMENT #{memory.id.split('-')[0]}
                </span>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-600 font-mono">
                        {new Date(memory.createdAt).toLocaleDateString()} {new Date(memory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button 
                        onClick={handleDelete}
                        disabled={deleting}
                        className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                    >
                        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-[var(--primary)]/20">
                {memory.content}
            </div>
        </div>
    );
}

function MemoInput({ onAdd }: { onAdd: () => void }) {
    const { t } = useLanguage();
    const { currentPrism } = usePrismStore();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || loading) return;

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(getApiUrl('/api/memories'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    action: 'addMemory', 
                    content,
                    currentPrism 
                })
            }).then(r => r.json());

            if (res.success) {
                setContent('');
                onAdd();
            }
        } catch (e) {
            console.error("Add memory error", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-1 pr-2">
                <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('cortex.input_placeholder') || "Store new neural fragment..."}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-4 text-white placeholder:text-zinc-600"
                />
                <button
                    type="submit"
                    disabled={!content.trim() || loading}
                    className="p-2 rounded-xl bg-[var(--primary)] text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
            </div>
        </form>
    );
}

// --- Main Content ---

function CortexContent() {
    const { t } = useLanguage();
    const { currentPrism } = usePrismStore();
    const supabase = createClient();

    const fetchMemories = useCallback(async (prism: PrismType) => {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = {
            'Authorization': `Bearer ${session?.access_token}`,
            'X-Current-Prism': prism
        };
        const res = await fetch(getApiUrl(`/api/memories?currentPrism=${prism}`), { 
            headers, 
            cache: 'no-store' 
        }).then(r => r.json());
        
        return res.success ? res.memories : [];
    }, [supabase]);

    const { data: memories, isLoading, isRevalidating, refresh } = usePrismData({
        fetchFn: fetchMemories,
        initialData: []
    });

    if (isLoading && !memories?.length) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-500 font-mono text-[10px] uppercase tracking-widest gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
                <span>Synchronizing Neural Mesh...</span>
            </div>
        );
    }

    return (
        <div className={`min-h-screen p-4 md:p-8 space-y-10 transition-opacity duration-300 ${isRevalidating ? 'opacity-50' : 'opacity-100'}`}>
            <div className="max-w-5xl mx-auto space-y-10">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <Link href="/" className="text-[var(--accent)] hover:underline text-[10px] font-mono mb-4 inline-flex items-center gap-2 uppercase tracking-widest">
                            ← {t('cortex.back_to_feed')}
                        </Link>
                        <div className="flex items-center gap-2 text-[var(--accent)] mb-1 font-mono">
                            <div className="w-2 h-2 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Neural Storage</span>
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">{t('cortex.title')}</h1>
                    </div>

                    <div className="w-full md:max-w-md">
                        <MemoInput onAdd={refresh} />
                    </div>
                </header>

                <section className="space-y-6">
                    <div className="flex items-center gap-2 text-zinc-500">
                        <History className="w-4 h-4" />
                        <h2 className="text-xs font-bold uppercase tracking-[0.3em]">{t('cortex.memory_nodes')}</h2>
                    </div>

                    {memories?.length === 0 ? (
                        <div className="p-20 text-center border border-dashed border-white/10 rounded-[2rem] bg-white/[0.01]">
                            <p className="text-zinc-500 italic text-sm">{t('cortex.empty_core')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {memories?.map((memory: any) => (
                                <MemoryCard key={memory.id} memory={memory} onDelete={refresh} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default function CortexPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-mono text-xs uppercase tracking-widest">
                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                DOCKING...
            </div>
        }>
            <CortexContent />
        </Suspense>
    );
}