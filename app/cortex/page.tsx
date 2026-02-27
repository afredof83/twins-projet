// app/cortex/page.tsx
import { Trash2 } from 'lucide-react'
import { deleteMemory, deleteNote } from '@/app/actions/cortex'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CortexUploader from '@/app/components/CortexUploader'

import prisma from '@/lib/prisma';
export default async function CortexPage() {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        include: {
            files: { orderBy: { createdAt: 'desc' } },
            notes: { orderBy: { createdAt: 'desc' } } // On ajoute la récupération des notes IA
        }
    })

    if (!profile) redirect('/login')

    return (
        <div className="min-h-screen text-white p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-10">

                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-flex items-center gap-2">
                            ← Retour au Tactical Feed
                        </Link>
                        <h1 className="text-3xl font-black italic tracking-tighter text-purple-400 flex items-center gap-3">
                            <span className="material-symbols-outlined">memory</span> CORTEX
                        </h1>
                        <p className="text-slate-500 text-sm font-mono uppercase tracking-widest mt-1">Neural Data Ingestion</p>
                    </div>
                </header>

                {/* Zone de saisie stylisée */}
                <div className="relative p-1 bg-gradient-to-b from-purple-500/20 to-transparent rounded-[2.5rem]">
                    <div className="bg-slate-950/80 rounded-[2.4rem] backdrop-blur-xl p-4">
                        <CortexUploader />
                    </div>
                </div>

                {/* Historique des fichiers */}
                <div className="space-y-6">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[1rem]">database</span> Source Code
                    </h2>

                    {profile.files.length === 0 ? (
                        <p className="text-slate-600 text-sm italic">Aucun dataset injecté.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {profile.files.map((file) => (
                                <div key={file.id} className="relative group p-4 rounded-xl bg-purple-500/[0.02] border border-purple-500/10 backdrop-blur-md hover:border-purple-500/30 transition-all flex justify-between items-center">
                                    <div className="flex-1 truncate pr-4">
                                        <p className="text-sm font-medium text-slate-300 truncate">{file.fileName}</p>
                                        <p className={`text-[10px] font-mono uppercase mt-1 ${file.isAnalyzed ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            STATUS: {file.isAnalyzed ? 'SYNTHESIZED' : 'PROCESSING'}
                                        </p>
                                    </div>
                                    <form action={deleteMemory}>
                                        <input type="hidden" name="fileId" value={file.id} />
                                        <input type="hidden" name="fileUrl" value={file.fileUrl} />
                                        <button className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </form>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Grille de notes IA style "Microchips" */}
                <div className="space-y-6">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[1rem]">history</span> Mémoires Extraites
                    </h2>

                    {(!profile.notes || profile.notes.length === 0) ? (
                        <div className="p-8 text-center border border-dashed border-purple-500/10 rounded-2xl">
                            <p className="text-slate-600 italic">Le noyau mémoriel est vide.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {profile.notes.map((note) => (
                                <div key={note.id} className="group relative p-6 rounded-2xl bg-purple-500/[0.03] border border-purple-500/10 backdrop-blur-md hover:border-purple-500/30 transition-all">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                            Synthèse #{note.id.split('-')[0]}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-slate-600 font-mono">
                                                {new Date(note.createdAt).toLocaleDateString('fr-FR')} {new Date(note.createdAt).toLocaleTimeString('fr-FR')}
                                            </span>
                                            <form action={deleteNote}>
                                                <input type="hidden" name="noteId" value={note.id} />
                                                <button className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                    <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-purple-500/20">
                                        {note.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
