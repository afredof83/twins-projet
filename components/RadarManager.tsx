'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseBrowser'
import { Plus, Trash, Rss, Save } from 'lucide-react'

export default function RadarManager({ profileId }: { profileId: string | null }) {
    const [sources, setSources] = useState<any[]>([])
    const [name, setName] = useState('')
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    // Charger les sources au démarrage
    useEffect(() => {
        if (profileId) fetchSources()
    }, [profileId])

    async function fetchSources() {
        const { data } = await supabase.from('RadarSource').select('*').order('createdAt', { ascending: false })
        if (data) setSources(data)
    }

    async function addSource(e: React.FormEvent) {
        e.preventDefault()
        if (!profileId || !name || !url) return

        setLoading(true)
        const { error } = await supabase
            .from('RadarSource')
            .insert([{ name, url, profileId }])

        if (!error) {
            setName(''); setUrl(''); fetchSources()
        } else {
            alert("Erreur lors de l'ajout : " + error.message)
        }
        setLoading(false)
    }

    async function deleteSource(id: string) {
        if (!confirm("Supprimer ce flux ?")) return
        await supabase.from('RadarSource').delete().eq('id', id)
        fetchSources()
    }

    if (!profileId) return null

    return (
        <div className="flex flex-col h-full bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden shadow-lg p-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Rss size={14} className="animate-pulse" /> Configuration Flux
            </h3>

            {/* Formulaire d'ajout */}
            <form onSubmit={addSource} className="flex flex-col gap-2 mb-6 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex gap-2">
                    <input
                        placeholder="Nom (ex: Le Monde)"
                        value={name} onChange={e => setName(e.target.value)}
                        className="flex-1 bg-slate-900 p-2 rounded text-xs text-white border border-slate-700 outline-none focus:border-cyan-500 placeholder-slate-600"
                    />
                </div>
                <div className="flex gap-2">
                    <input
                        placeholder="URL RSS (https://...)"
                        value={url} onChange={e => setUrl(e.target.value)}
                        className="flex-1 bg-slate-900 p-2 rounded text-xs text-white border border-slate-700 outline-none focus:border-cyan-500 placeholder-slate-600 font-mono"
                    />
                    <button disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 p-2 rounded text-white transition disabled:opacity-50">
                        {loading ? <Save size={14} className="animate-spin" /> : <Plus size={14} />}
                    </button>
                </div>
            </form>

            {/* Liste des sources */}
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                {sources.length === 0 && <p className="text-[10px] text-slate-500 text-center italic">Aucun flux personnalisé.</p>}
                {sources.map(s => (
                    <div key={s.id} className="flex justify-between items-center p-2 bg-slate-800/50 hover:bg-slate-800 rounded border border-slate-800 hover:border-slate-600 transition group">
                        <div className="overflow-hidden">
                            <p className="font-bold text-xs text-slate-300 truncate">{s.name}</p>
                            <p className="text-[10px] text-slate-500 truncate font-mono opacity-70 w-32">{s.url}</p>
                        </div>
                        <button onClick={() => deleteSource(s.id)} className="text-slate-600 hover:text-red-400 p-2 transition" title="Supprimer ce flux">
                            <Trash size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
