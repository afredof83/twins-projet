'use client';

import { useEffect, useState } from 'react';
import { Radio, ExternalLink, RefreshCw } from 'lucide-react';

export default function RadarWidget({ profileId }: { profileId: string | null }) {
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    const fetchNews = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/radar');
            const data = await res.json();
            if (data.news) setNews(data.news);
        } catch (e) {
            console.error("Erreur Radar", e);
        } finally {
            setLoading(false);
        }
    };

    const saveToMemory = async (e: React.MouseEvent, item: any) => {
        e.preventDefault(); // Empêche l'ouverture du lien
        if (!profileId) return;

        setSaving(item.link);
        try {
            await fetch('/api/memories/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profileId,
                    content: `[VEILLE] ${item.title} (${item.source}) - ${item.link}`,
                    type: 'news'
                })
            });
            alert("News mémorisée !");
        } catch (error) {
            console.error("Erreur sauvegarde", error);
        } finally {
            setSaving(null);
        }
    };

    useEffect(() => {
        fetchNews();
        const interval = setInterval(fetchNews, 60000 * 5); // Auto-refresh toutes les 5 min
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full flex flex-col bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden shadow-lg group hover:border-cyan-500/50 transition-all">
            {/* Header */}
            <div className="p-3 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    <Radio size={14} className={loading ? "animate-spin" : "animate-pulse"} />
                    RADAR MONDIAL
                </div>
                <button onClick={fetchNews} className="text-slate-500 hover:text-white transition-colors">
                    <RefreshCw size={12} />
                </button>
            </div>

            {/* Contenu Scrollable */}
            <div className="flex-1 overflow-y-auto p-0 custom-scrollbar relative">
                {loading && news.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-mono animate-pulse">
                        INITIALISATION SCAN...
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800/50">
                        {news.map((item, idx) => (
                            <div key={idx} className="block hover:bg-cyan-900/10 transition-colors group/item relative">
                                <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block p-3 pr-10"
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{item.source}</span>
                                        <span className="text-[10px] text-slate-600">{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <h4 className="text-xs text-slate-300 font-medium leading-relaxed group-hover/item:text-cyan-300 transition-colors line-clamp-2">
                                        {item.title}
                                    </h4>
                                </a>
                                <button
                                    onClick={(e) => saveToMemory(e, item)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-cyan-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                    title="Mémoriser cette news"
                                >
                                    {saving === item.link ? <RefreshCw size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Décoratif */}
            <div className="h-1 w-full bg-slate-800">
                <div className="h-full bg-cyan-600 animate-pulse w-1/3"></div>
            </div>
        </div>
    );
}
