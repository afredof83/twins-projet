import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { PrismaClient } from '@prisma/client'
import Link from 'next/link'

const prisma = new PrismaClient()

export default async function DashboardPage() {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
            },
        }
    )

    // 1. Vérification stricte de l'identité
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 2. Récupération des données de l'Agent via Prisma
    const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        include: {
            radars: true, // On récupère les opportunités débusquées
            files: true   // On récupère les fichiers du Cortex
        }
    })

    if (!profile) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
                Erreur critique : Profil introuvable dans la base. Le trigger SQL a échoué.
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* En-tête du Dashboard */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Espace de Commandement</h1>
                        <p className="text-gray-400 mt-1">Supervision de votre Agent Digital</p>
                    </div>
                    <div className="text-sm bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full border border-blue-500/20 font-mono">
                        {user.email}
                    </div>
                </header>

                {/* Modules Principaux */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Module : Radar / Opportunités */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 backdrop-blur-md hover:border-white/20 transition-all">
                        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            <span className="text-blue-400">📡</span> Le Radar
                        </h2>
                        <p className="text-gray-400 text-sm mb-4">Opportunités détectées par l'agent</p>
                        <div className="text-4xl font-bold text-white mb-2">
                            {profile.radars.length}
                        </div>
                        <p className="text-xs text-gray-500">En attente de traitement</p>
                    </div>

                    {/* Module : Cortex / Mémoire */}
                    <Link href="/cortex" className="block p-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 backdrop-blur-md hover:border-purple-500/30 hover:bg-white/10 transition-all cursor-pointer group">
                        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 group-hover:text-purple-300 transition-colors">
                            <span className="text-purple-400">🧠</span> Le Cortex
                        </h2>
                        <p className="text-gray-400 text-sm mb-4">Fichiers ingérés et analysés</p>
                        <div className="text-4xl font-bold text-white mb-2">
                            {profile.files.length}
                        </div>
                        <p className="text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">→ Ouvrir le module d'ingestion</p>
                    </Link>

                </div>

                {/* Bouton temporaire de déconnexion pour tester */}
                <form action="/auth/signout" method="post" className="text-right">
                    <button className="text-sm text-red-400 hover:text-red-300 transition">
                        Déconnexion d'urgence
                    </button>
                </form>

            </div>
        </div>
    )
}
