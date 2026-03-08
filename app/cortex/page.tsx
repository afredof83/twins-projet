'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import CortexUploader from '@/app/components/CortexUploader';
import CortexDeleteButton from '@/app/components/CortexDeleteButton';
import { getApiUrl } from '@/lib/api';
import { createClient } from '@/lib/supabaseBrowser';
import { useLanguage } from '@/context/LanguageContext';

function CortexContent() {
    const { t } = useLanguage();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const { createClient } = await import('@/lib/supabaseBrowser');
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            const headers: any = { 'Content-Type': 'application/json' };
            if (session) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            // ⚡ Le cache: 'no-store' empêche Next.js de renvoyer l'erreur 401 mémorisée
            const res = await fetch(getApiUrl('/api/cortex'), {
                headers,
                cache: 'no-store'
            }).then(r => r.json());

            if (res.success) {
                setProfile(res.profile);
            } else {
                console.error("Cortex API Error:", res.error);
                if (res.error === 'Non autorisé') {
                    setProfile(null); // Déclenche l'écran rouge
                }
            }
        } catch (e) {
            console.error("fetchData error", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs uppercase tracking-widest">
                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                {t('profile.common.loading') || 'LOADING CORTEX...'}
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-red-500 font-mono">
                <p className="mb-4">⚠️ {t('cortex.access_error')}</p>
                <button onClick={fetchData} className="px-4 py-2 border border-red-500 rounded hover:bg-red-500/20">
                    {t('cortex.retry')}
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-10">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-flex items-center gap-2">
                            ← {t('cortex.back_to_feed')}
                        </Link>
                        <h1 className="text-3xl font-black italic tracking-tighter text-purple-400 flex items-center gap-3 uppercase">
                            <span className="material-symbols-outlined">memory</span> {t('cortex.title')}
                        </h1>
                        <p className="text-slate-500 text-sm font-mono uppercase tracking-widest mt-1">{t('cortex.subtitle')}</p>
                    </div>
                </header>

                <div className="relative p-1 bg-gradient-to-b from-purple-500/20 to-transparent rounded-[2.5rem]">
                    <div className="bg-slate-950/80 rounded-[2.4rem] backdrop-blur-xl p-4">
                        <CortexUploader onUploadComplete={fetchData} />
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[1rem]">database</span> {t('cortex.memory_nodes')}
                    </h2>

                    {profile.files.length === 0 ? (
                        <p className="text-slate-600 text-sm italic">{t('cortex.no_dataset')}</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {profile.files.map((file: any) => (
                                <div key={file.id} className="relative group p-4 rounded-xl bg-purple-500/[0.02] border border-purple-500/10 backdrop-blur-md hover:border-purple-500/30 transition-all flex justify-between items-center">
                                    <div className="flex-1 truncate pr-4">
                                        <p className="text-sm font-medium text-slate-300 truncate">{file.fileName}</p>
                                        <p className={`text-[10px] font-mono uppercase mt-1 ${file.isAnalyzed ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            STATUS: {file.isAnalyzed ? 'SYNTHESIZED' : 'PROCESSING'}
                                        </p>
                                    </div>
                                    <CortexDeleteButton
                                        action="deleteMemory"
                                        payload={{ fileId: file.id, fileUrl: file.fileUrl }}
                                        onDelete={fetchData}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[1rem]">history</span> {t('cortex.memory_nodes')}
                    </h2>

                    {(!profile.memories || profile.memories.length === 0) ? (
                        <div className="p-8 text-center border border-dashed border-purple-500/10 rounded-2xl">
                            <p className="text-slate-600 italic">{t('cortex.empty_core')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {profile.memories.map((memory: any) => (
                                <div key={memory.id} className="group relative p-6 rounded-2xl bg-purple-500/[0.03] border border-purple-500/10 backdrop-blur-md hover:border-purple-500/30 transition-all">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                            {t('cortex.fragment')} #{memory.id.split('-')[0]}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-slate-600 font-mono">
                                                {new Date(memory.createdAt).toLocaleDateString('fr-FR')} {new Date(memory.createdAt).toLocaleTimeString('fr-FR')}
                                            </span>
                                            <CortexDeleteButton
                                                action="deleteCortexMemory"
                                                payload={{ memoryId: memory.id }}
                                                onDelete={fetchData}
                                                className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                iconSize={14}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-purple-500/20">
                                        {memory.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CortexPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs uppercase tracking-widest">
                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                LOADING...
            </div>
        }>
            <CortexContent />
        </Suspense>
    );
}