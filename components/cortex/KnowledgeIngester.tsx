'use client';
import { useState } from 'react';
import { Link2, Loader2, Database, CheckCircle, Trash2, Volume2, Search } from 'lucide-react';

export default function KnowledgeIngester({ profileId, memories = [], onRefresh }: { profileId: string, memories?: any[], onRefresh?: () => void }) {
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [searchTerm, setSearchTerm] = useState('');

    const handleIngest = async () => {
        if (!url) return;
        setStatus('loading');

        try {
            const res = await fetch('/api/cortex/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    profileId,
                    category: 'STRATÉGIE'
                })
            });

            if (res.ok) {
                setStatus('success');
                setTimeout(() => setStatus('idle'), 3000);
                setUrl('');
                if (onRefresh) onRefresh();
            } else {
                setStatus('error');
            }
        } catch (e) {
            setStatus('error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer ce souvenir ?')) return;
        try {
            const res = await fetch(`/api/memories/${id}`, { method: 'DELETE' });
            if (res.ok) {
                if (onRefresh) onRefresh();
            }
        } catch (e) {
            console.error("Erreur suppression:", e);
        }
    };

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'fr-FR';
        window.speechSynthesis.speak(u);
    };

    const filteredMemories = (memories || []).filter(m =>
        (m.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.type || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-xl">
                <h3 className="text-slate-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                    <Database size={14} className="text-cyan-400" />
                    Injecter du Savoir (URL)
                </h3>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-cyan-500 outline-none"
                    />

                    <button
                        onClick={handleIngest}
                        disabled={status === 'loading'}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${status === 'success' ? 'bg-green-600 text-white' :
                            status === 'error' ? 'bg-red-600 text-white' :
                                'bg-cyan-900/40 text-cyan-300 border border-cyan-600/50 hover:bg-cyan-800'
                            }`}
                    >
                        {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> :
                            status === 'success' ? <CheckCircle size={16} /> :
                                <Link2 size={16} />}
                        {status === 'loading' ? 'ANALYSE...' : status === 'success' ? 'MÉMORISÉ' : 'INGÉRER'}
                    </button>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-slate-400 text-xs font-bold uppercase flex items-center gap-2">
                        <Database size={14} className="text-purple-400" />
                        Base de Connaissances ({memories?.length || 0})
                    </h3>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-full pl-9 pr-3 py-1 text-xs text-white focus:border-purple-500 outline-none w-48"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredMemories.map((m: any) => (
                        <div key={m.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 hover:border-purple-500/50 transition-all group relative">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] uppercase bg-slate-950 px-2 py-0.5 rounded text-slate-500 border border-slate-800">
                                    {m.type || 'RAW'}
                                </span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => speak(m.content)} className="p-1 hover:text-cyan-400 text-slate-500"><Volume2 size={12} /></button>
                                    <button onClick={() => handleDelete(m.id)} className="p-1 hover:text-red-400 text-slate-500"><Trash2 size={12} /></button>
                                </div>
                            </div>
                            <p className="text-sm text-slate-300 line-clamp-4 leading-relaxed">{m.content}</p>
                            <div className="mt-3 pt-3 border-t border-slate-800/50 flex justify-between items-center">
                                <span className="text-[10px] text-slate-600 font-mono">{new Date(m.createdAt).toLocaleDateString()}</span>
                                {m.source === 'autonomous_cortex' && <span className="text-[10px] text-purple-400 flex items-center gap-1"><CheckCircle size={10} /> AUTO</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
