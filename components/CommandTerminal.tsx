'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
// Server actions supprimées — on utilise fetch vers /api/terminal et /api/sync-cortex

interface WebResult {
    title: string;
    url: string;
    content: string;
}

interface HistoryEntry {
    role: 'user' | 'agent';
    text: string;
    webResults?: WebResult[];
}

function SyncButton({ result, onStatsUpdate }: { result: WebResult; onStatsUpdate?: (stats: any) => void }) {
    const router = useRouter();
    const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced'>('idle');

    const handleSync = async () => {
        setSyncState('syncing');
        try {
            const { createClient: createSupabase } = await import('@/lib/supabaseBrowser');
            const supabase = createSupabase();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const res = await fetch(getApiUrl('/api/sync-cortex'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ title: result.title, url: result.url, content: result.content })
            }).then(r => r.json());
            if (res.success) {
                setSyncState('synced');
                if (res.newStats && onStatsUpdate) {
                    onStatsUpdate(res.newStats);
                }
                router.refresh();
            } else {
                setSyncState('idle');
            }
        } catch {
            setSyncState('idle');
        }
    };

    return (
        <button
            onClick={handleSync}
            disabled={syncState !== 'idle'}
            className="text-[10px] bg-cyan-900/30 border border-cyan-500/50 text-cyan-400 px-2 py-1 rounded hover:bg-cyan-500/20 transition-all uppercase tracking-wider mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {syncState === 'idle' && '⚡ Sync Cortex'}
            {syncState === 'syncing' && 'VECTORISATION...'}
            {syncState === 'synced' && '✓ SYNCHRONISÉ'}
        </button>
    );
}

export function CommandTerminal({ userId, onStatsUpdate }: { userId: string; onStatsUpdate?: (stats: any) => void }) {
    const [command, setCommand] = useState('');
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleCommand = async () => {
        if (!command.trim()) return;

        const currentCmd = command;
        setHistory(prev => [...prev, { role: 'user', text: currentCmd }]);
        setCommand('');
        setIsProcessing(true);

        try {
            const { createClient: createSupabase } = await import('@/lib/supabaseBrowser');
            const supabase = createSupabase();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const result = await fetch(getApiUrl('/api/terminal'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ userId, prompt: currentCmd })
            }).then(r => r.json());
            if (result.success && result.answer) {
                const textAnswer = typeof result.answer === 'string' ? result.answer : JSON.stringify(result.answer);
                setHistory(prev => [...prev, {
                    role: 'agent',
                    text: textAnswer,
                    webResults: result.webResults || []
                }]);
            } else {
                setHistory(prev => [...prev, { role: 'agent', text: "[ERREUR] Liaison IA perdue." }]);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="glass-panel rounded-xl flex flex-col h-[500px] font-mono text-sm overflow-hidden shadow-2xl">

            {/* HEADER TERMINAL */}
            <div className="flex items-center justify-between border-b border-white/10 p-4 mx-2">
                <h3 className="text-xs text-cyan-500 font-bold tracking-widest flex items-center gap-2">
                    <span className="animate-pulse">☄️</span> IPSE_OS // TERMINAL
                </h3>
                <span className="text-[10px] flex items-center gap-2 text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> RADAR EN LIGNE
                </span>
            </div>

            {/* ZONE DE CHAT / LOGS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-gray-300 custom-scrollbar">
                <div className="text-cyan-600/50 text-xs italic">Système initialisé. En attente d&apos;ordres tactiques...</div>

                {history.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <span className={`text-[9px] tracking-wider mb-1 uppercase ${msg.role === 'user' ? 'text-gray-500' : 'text-cyan-500'}`}>
                            {msg.role === 'user' ? 'VOUS' : 'CORTEX'}
                        </span>
                        <div className={`p-3 rounded-xl max-w-[85%] text-sm ${msg.role === 'user'
                            ? 'bg-black/40 border border-white/5 text-gray-200'
                            : 'bg-cyan-900/10 border border-cyan-500/20 text-cyan-100 whitespace-pre-wrap backdrop-blur-sm'
                            }`}>
                            {msg.text}

                            {/* Résultats Web avec bouton Sync Cortex */}
                            {msg.webResults && msg.webResults.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-cyan-500/10 space-y-3">
                                    <div className="text-[9px] text-cyan-500/60 uppercase tracking-widest">Capteurs Externes</div>
                                    {msg.webResults.map((wr, j) => (
                                        <div key={j} className="bg-black/30 rounded-lg p-2 border border-white/5">
                                            <a href={wr.url} target="_blank" rel="noopener noreferrer"
                                                className="text-[11px] text-cyan-400 hover:underline font-semibold">
                                                {wr.title}
                                            </a>
                                            <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{wr.content}</p>
                                            <SyncButton result={wr} onStatsUpdate={onStatsUpdate} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isProcessing && (
                    <div className="text-cyan-500 text-xs animate-pulse">&gt; Scan réseau et Web en cours...</div>
                )}
            </div>

            {/* ZONE DE SAISIE */}
            <div className="p-3 mx-4 mb-2 border-t border-white/10 bg-transparent flex gap-3 items-center">
                <span className="text-cyan-500 font-bold">&gt;</span>
                <input
                    type="text"
                    className="flex-1 bg-transparent border-none text-cyan-400 focus:outline-none focus:ring-0 placeholder-cyan-900/50 text-sm"
                    placeholder="Ex: Cherche un CTO expert en cybersécurité..."
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
                    disabled={isProcessing}
                />
            </div>
        </div>
    );
}
