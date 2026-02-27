// app/cortex/page.tsx
import { Trash2 } from 'lucide-react'
import { deleteMemory, deleteNote } from '@/app/actions/cortex'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { PrismaClient } from '@prisma/client'
import Link from 'next/link'
import CortexUploader from '@/app/components/CortexUploader'

const prisma = new PrismaClient()

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
        <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* En-tête avec bouton retour */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-flex items-center gap-2">
                            ← Retour au Commandement
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight text-purple-400">Le Cortex</h1>
                        <p className="text-gray-400 mt-1">Ingestion et gestion de la mémoire de l'Agent</p>
                    </div>
                </header>

                {/* Le module d'Upload */}
                <div className="py-4">
                    <CortexUploader />
                </div>

                {/* Historique des fichiers (Préparation pour la suite) */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                    <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-4">Mémoires enregistrées ({profile.files.length})</h2>

                    {profile.files.length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucun document n'a encore été ingéré.</p>
                    ) : (
                        <ul className="space-y-3">
                            {profile.files.map((file) => (
                                <li key={file.id} className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5 group hover:bg-white/5 transition-colors">

                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium">{file.fileName}</span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${file.isAnalyzed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                            {file.isAnalyzed ? 'Analysé par Mistral' : 'En attente'}
                                        </span>
                                    </div>

                                    {/* Le Formulaire caché qui déclenche la Server Action */}
                                    <form action={deleteMemory}>
                                        <input type="hidden" name="fileId" value={file.id} />
                                        <input type="hidden" name="fileUrl" value={file.fileUrl} />
                                        <button
                                            type="submit"
                                            className="p-2 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                            title="Purger cette mémoire"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </form>

                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Le Cerveau : Synthèses de Mistral AI */}
                <div className="mt-12">
                    <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-6">
                        Connaissances extraites par l'Agent
                    </h2>

                    {(!profile.notes || profile.notes.length === 0) ? (
                        <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
                            <p className="text-gray-400">Le cerveau de votre Jumeau est encore vide. Uploadez un document pour l'entraîner.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {profile.notes.map((note) => (
                                <div key={note.id} className="relative p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/10 backdrop-blur-md hover:border-purple-500/30 transition-all group">

                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Synthèse IA</span>

                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-500">{new Date(note.createdAt).toLocaleDateString('fr-FR')}</span>

                                            {/* Bouton de suppression de la note */}
                                            <form action={deleteNote}>
                                                <input type="hidden" name="noteId" value={note.id} />
                                                <button
                                                    type="submit"
                                                    className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                    title="Effacer cette mémoire"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </form>
                                        </div>
                                    </div>

                                    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
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
