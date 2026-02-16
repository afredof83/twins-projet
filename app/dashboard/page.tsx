'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Radio, Activity, Trash2, LogOut, Radar, Loader2, BrainCircuit, X, CheckCircle, Ban, Search, Eye, ShieldAlert, ShieldX, Unlock, Zap, TrendingUp, Menu, ChevronDown, FileText, Upload, Plus, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

// Components
import SecureWhatsApp from '@/components/SecureWhatsApp';
import KnowledgeIngester from '@/components/cortex/KnowledgeIngester';

// --- LOGIQUE METIER ---
const calculateSynergy = (target: any, memories: any[]) => {
    let score = 45;
    if (target.bio && target.bio.length > 20) score += 15;
    if (memories.length > 0) score += 10;
    if (memories.some(m => m.type === 'knowledge')) score += 15;
    score += Math.floor(Math.random() * 15) - 5;
    score = Math.min(98, Math.max(12, score));

    const opportunities = [];
    const fullText = (target.bio + " " + memories.map(m => m.content).join(" ")).toLowerCase();

    if (fullText.includes("recherche") || fullText.includes("besoin") || fullText.includes("help")) opportunities.push("Demande active détectée.");
    if (fullText.includes("expert") || fullText.includes("senior") || fullText.includes("lead")) opportunities.push("Expertise technique exploitable.");
    if (fullText.includes("projet") || fullText.includes("startup")) opportunities.push("Synergie projet possible.");
    if (opportunities.length === 0) opportunities.push("Exploration requise : Profil passif.");

    return { score, opportunities };
};

export default function MissionControl() {
    const router = useRouter();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [memories, setMemories] = useState<any[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    // États UI
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [channels, setChannels] = useState<any[]>([]);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);
    const [showCortexPanel, setShowCortexPanel] = useState(false);
    const [showBlockPanel, setShowBlockPanel] = useState(false);

    // États Ingestion (Drop & Thought)
    const [quickThought, setQuickThought] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [unreadIds, setUnreadIds] = useState<string[]>([]);
    const [interventions, setInterventions] = useState<any[]>([]);
    const [blockedIds, setBlockedIds] = useState<string[]>([]);

    const addLog = (message: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev].slice(0, 50));

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/'); return; }
            setProfileId(user.id);
            setIsInitialized(true);
            fetchChannels(user.id);
            fetchBlockList(user.id);
            loadMemories(user.id);
        };
        init();
    }, []);

    useEffect(() => {
        if (!profileId) return;
        const channelSubscription = supabase.channel('global_dashboard_main')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Channel' }, async (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newChannel = payload.new as any;
                    if (newChannel.member_one_id === profileId || newChannel.member_two_id === profileId) {
                        addLog(`[SYSTÈME] Nouvelle liaison détectée.`);
                        setUnreadIds(prev => [...prev, newChannel.id]);
                    }
                }
                await fetchChannels(profileId);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Message' }, (payload) => {
                const msg = payload.new;
                if (msg.fromId !== profileId) {
                    setUnreadIds(prev => {
                        if (prev.includes(msg.channel_id)) return prev;
                        return [...prev, msg.channel_id];
                    });
                    fetchChannels(profileId);
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channelSubscription); };
    }, [profileId]);

    const fetchChannels = async (pid: string) => {
        const { data } = await supabase.from('Channel').select('*').or(`member_one_id.eq.${pid},member_two_id.eq.${pid}`).order('last_message_at', { ascending: false });
        if (data) setChannels(data);
    };

    const fetchBlockList = async (pid: string) => {
        const { data } = await supabase.from('BlockList').select('blockedId').eq('blockerId', pid);
        if (data) setBlockedIds(data.map(b => b.blockedId));
    };

    // --- LOGIQUE INGESTION (Drop & Thought) ---
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!profileId) return;
        addLog(`[SENSOR] Analyse de ${file.name}...`);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('profileId', profileId);

        try {
            const res = await fetch('/api/sensors/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                addLog(`[SUCCÈS] ${data.fragments || 'Données'} fragments mémorisés.`);
                loadMemories(profileId);
            } else {
                addLog(`[ERREUR] ${data.error || "Échec lecture"}`);
            }
        } catch (err) { addLog(`[CRITIQUE] Échec upload.`); }
    };

    const handleQuickThoughtSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!quickThought.trim() || !profileId) return;

        const content = quickThought;
        setQuickThought("");
        addLog(`[CORTEX] Sauvegarde pensée rapide...`);

        const { error } = await supabase.from('Memory').insert({
            profileId,
            content,
            type: 'thought',
            source: 'manual_input'
        });

        if (!error) {
            addLog(`[SUCCÈS] Pensée archivée.`);
            loadMemories(profileId);
        } else {
            addLog(`[ERREUR] Sauvegarde impossible.`);
        }
    };

    // --- LOGIQUE SCANNER ---
    const triggerManualScan = async () => {
        if (!profileId) return;
        setIsScanning(true);
        setInterventions([]);
        addLog("[RADAR] Triangulation en cours...");

        setTimeout(async () => {
            const { data: blocks } = await supabase.from('BlockList').select('blockedId').eq('blockerId', profileId);
            const currentBlockedIds = blocks?.map(b => b.blockedId) || [];
            setBlockedIds(currentBlockedIds);

            const { data: targets } = await supabase
                .from('Profile')
                .select('*')
                .neq('id', profileId)
                .not('id', 'in', `(${currentBlockedIds.length > 0 ? currentBlockedIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
                .limit(1);

            if (targets && targets.length > 0) {
                const target = targets[0];
                const { data: intel } = await supabase.from('Memory').select('*').eq('profileId', target.id);
                const analysis = calculateSynergy(target, intel || []);

                setInterventions([{
                    id: `scan-${Date.now()}`,
                    viewMode: 'SUMMARY',
                    targetName: target.name || 'Signature Inconnue',
                    targetId: target.id,
                    bio: target.bio || "Bio cryptée ou inexistante.",
                    thoughts: intel?.filter(m => m.type === 'thought').map(m => m.content) || [],
                    knowledge: intel?.filter(m => m.type === 'knowledge').map(m => m.content) || [],
                    matchScore: analysis.score,
                    opportunities: analysis.opportunities
                }]);
                addLog(`[RADAR] Signature analysée : ${analysis.score}% compatibilité.`);
            } else {
                addLog(`[RADAR] Silence radio sur le secteur.`);
            }
            setIsScanning(false);
        }, 1500);
    };

    const handleAnalyze = (scanId: string) => {
        setInterventions(prev => prev.map(item => item.id === scanId ? { ...item, viewMode: 'DEEP_AUDIT' } : item));
        addLog(`[CORTEX] Audit complet déployé.`);
    };

    const handleAcceptConnection = async (targetId: string) => {
        addLog(`[COMM] Handshake protocolaire initié...`);
        await supabase.from('Channel').insert({
            member_one_id: profileId,
            member_two_id: targetId,
            topic: "LIAISON SÉCURISÉE",
            last_message_at: new Date().toISOString(),
            initiatorId: profileId
        });
        setInterventions([]);
    };

    const handleBlock = async (targetId: string) => {
        if (!confirm("Confirmer le protocole de confinement ?")) return;
        await supabase.from('BlockList').insert({ blockerId: profileId, blockedId: targetId });
        setBlockedIds(prev => [...prev, targetId]);
        setInterventions([]);
        addLog(`[SÉCURITÉ] Menace neutralisée (Ban).`);
    };

    const handleDeleteChannel = async (id: string) => {
        if (confirm("Rompre la liaison ?")) {
            await supabase.from('Channel').delete().eq('id', id);
            addLog(`[SYSTÈME] Canal détruit.`);
        }
    };

    const toggleChannelChat = (id: string, pId: string) => {
        if (activeChannelId === id && isChatOpen) {
            setIsChatOpen(false);
        } else {
            setActiveChannelId(id); setChatPartnerId(pId); setIsChatOpen(true);
            setUnreadIds(prev => prev.filter(uid => uid !== id));
        }
    };

    const loadMemories = async (pid: string) => {
        const res = await fetch(`/api/memories?profileId=${pid}`);
        const data = await res.json();
        if (data.memories) setMemories(data.memories);
    };

    if (!isInitialized) return <div className="min-h-screen bg-black flex items-center justify-center text-cyan-500"><Loader2 className="animate-spin" size={40} /></div>;

    return (
        <main className="relative min-h-screen w-full bg-[#020202] text-slate-200 font-sans flex flex-col overflow-hidden selection:bg-cyan-500/30">

            {/* --- BACKGROUND TACTIQUE --- */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#050505] to-black z-0 pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] z-0 pointer-events-none opacity-50" />

            <div className="flex-1 flex flex-col p-2 md:p-6 z-10 max-w-[1800px] mx-auto w-full h-screen">

                {/* --- HEADER --- */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-4 pb-4 border-b border-white/5 backdrop-blur-sm px-2 gap-4 md:gap-0">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="p-2.5 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-md">
                            <ShieldAlert size={24} className="text-cyan-400" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">MISSION CONTROL</h1>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_lime]"></span>
                                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">OP: {profileId?.slice(0, 8)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        {/* BOUTON SCANNER (AMBRE/ORANGE) */}
                        <button onClick={triggerManualScan} disabled={isScanning} className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 border border-amber-500/50 text-amber-500 rounded-lg text-[11px] font-bold hover:bg-amber-500 hover:text-white transition-all uppercase tracking-widest shadow-lg shadow-amber-900/10 whitespace-nowrap active:scale-95">
                            {isScanning ? <Loader2 className="animate-spin" size={14} /> : <Radar size={14} />}
                            SCANNER
                        </button>
                        <button onClick={() => setShowBlockPanel(true)} className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-[11px] font-bold hover:bg-red-500 hover:text-white transition-all uppercase whitespace-nowrap active:scale-95">
                            <ShieldX size={14} /> Blacklist ({blockedIds.length})
                        </button>
                        <div className="h-6 w-px bg-white/10 mx-1 hidden md:block"></div>
                        <button onClick={() => setShowCortexPanel(true)} className="p-2.5 bg-white/5 border border-white/10 rounded-lg hover:bg-cyan-500/20 hover:text-cyan-400 hover:border-cyan-500/30 transition-all text-slate-400"><BrainCircuit size={18} /></button>
                        <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="p-2.5 bg-white/5 border border-white/10 rounded-lg hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all text-slate-400"><LogOut size={18} /></button>
                    </div>
                </header>

                {/* --- MAIN GRID --- */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 flex-1 min-h-0">

                    {/* GAUCHE: INTERFACE RADAR & INGESTION */}
                    <div className="lg:col-span-8 flex flex-col h-full overflow-hidden order-2 lg:order-1 relative gap-4">

                        {/* 1. ZONE "NEURAL LINK" (DROP & THOUGHT) */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`bg-black/40 backdrop-blur-xl border rounded-2xl p-3 transition-all duration-300 flex flex-col gap-2 ${isDragging ? 'border-cyan-500 bg-cyan-900/20 shadow-[0_0_30px_rgba(6,182,212,0.2)]' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <div className="flex items-center gap-3 w-full">
                                {/* Input Pensée Rapide */}
                                <div className="flex-1 relative">
                                    <form onSubmit={handleQuickThoughtSubmit} className="flex gap-2">
                                        <div className="relative flex-1">
                                            <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                            <input
                                                type="text"
                                                value={quickThought}
                                                onChange={(e) => setQuickThought(e.target.value)}
                                                placeholder={isDragging ? "Relâchez le fichier pour uploader..." : "Saisir une pensée rapide ou glisser un fichier..."}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:bg-black/50 transition-all"
                                            />
                                        </div>
                                        <button type="submit" disabled={!quickThought} className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl hover:bg-cyan-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                            <Send size={16} />
                                        </button>
                                    </form>
                                </div>

                                {/* Bouton Upload Fichier (Hidden Input) */}
                                <div className="w-px h-6 bg-white/10 mx-1"></div>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-400 transition-all uppercase tracking-wider whitespace-nowrap">
                                    <Upload size={14} /> <span className="hidden sm:inline">Upload</span>
                                </button>
                            </div>
                        </div>

                        {/* 2. ZONE RADAR (L'ancien panneau) */}
                        <div className="flex-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-y-auto custom-scrollbar shadow-2xl p-4 md:p-8 relative">
                            {/* Scanlines Décoratives */}
                            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px]" />

                            <InterceptorInterface
                                interventions={interventions}
                                onAnalyze={handleAnalyze}
                                onAccept={handleAcceptConnection}
                                onBlock={handleBlock}
                                onIgnore={() => setInterventions([])}
                                onRefresh={triggerManualScan}
                            />
                        </div>
                    </div>

                    {/* DROITE: LISTE CANAUX */}
                    <div className={`lg:col-span-4 flex flex-col gap-4 overflow-hidden order-1 lg:order-2 ${isChatOpen ? 'lg:flex' : ''}`}>
                        <div className="flex-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex flex-col shadow-2xl relative">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-4 flex items-center gap-2 px-1 tracking-widest">
                                <Radio size={14} className="text-cyan-400 animate-pulse" /> Signaux Actifs
                            </h3>

                            <div className="space-y-2.5 overflow-y-auto flex-1 custom-scrollbar pr-1">
                                {channels.map((channel) => {
                                    const hasNotif = unreadIds.includes(channel.id);
                                    const isActive = activeChannelId === channel.id && isChatOpen;
                                    return (
                                        <div key={channel.id} className={`rounded-2xl border transition-all duration-300 relative overflow-hidden group ${isActive ? 'border-cyan-500/50 bg-cyan-950/20' : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'}`}>
                                            {hasNotif && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_15px_cyan]" />}

                                            <div className="p-3.5 flex justify-between items-center cursor-pointer" onClick={() => toggleChannelChat(channel.id, channel.member_one_id === profileId ? channel.member_two_id : channel.member_one_id)}>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`text-xs font-bold uppercase ${isActive ? 'text-cyan-300' : 'text-slate-200'}`}>{channel.topic}</div>
                                                        {hasNotif && <span className="bg-cyan-500 text-black text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse shadow-lg shadow-cyan-500/50">NEW</span>}
                                                    </div>
                                                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">ID: {channel.id.slice(0, 8)}</div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); toggleChannelChat(channel.id, channel.member_one_id === profileId ? channel.member_two_id : channel.member_one_id); }} className={`p-2 rounded-lg transition-all ${isActive ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                                                        {isActive ? <ChevronDown size={14} /> : <TrendingUp size={14} />}
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteChannel(channel.id); }} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                                </div>
                                            </div>

                                            {/* CHAT CONTAINER */}
                                            {isActive && (
                                                <div className="h-[500px] border-t border-white/5 animate-in slide-in-from-top-2">
                                                    <SecureWhatsApp profileId={profileId} channelId={activeChannelId} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {channels.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-40 opacity-30 text-center border-2 border-dashed border-white/10 rounded-2xl">
                                        <Radio size={24} className="mb-2" />
                                        <span className="text-[10px] uppercase font-bold tracking-widest">Aucune liaison</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- LOGS TERMINAL --- */}
                <div className="mt-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-3 h-28 overflow-hidden flex flex-col font-mono text-[10px] shadow-lg">
                    <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-1">
                        <span className="text-slate-500 flex items-center gap-2 uppercase tracking-wider font-bold"><Activity size={12} className="text-cyan-500" /> Console Système</span>
                        <span className="text-green-500 animate-pulse text-[9px]">● LIVE FEED</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1 text-slate-400 custom-scrollbar mask-image-b">
                        {logs.map((log, i) => <div key={i} className="border-l-2 border-white/10 pl-2 py-0.5 hover:bg-white/5 hover:text-cyan-200 transition-colors cursor-default">{log}</div>)}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showCortexPanel && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="w-full max-w-4xl h-[85vh] bg-[#0a0a0a]/90 border border-white/10 rounded-3xl relative overflow-hidden flex flex-col shadow-2xl ring-1 ring-white/10">
                        <button onClick={() => setShowCortexPanel(false)} className="absolute top-4 right-4 z-50 p-2 text-slate-400 hover:text-white transition-colors"><X /></button>
                        <div className="flex-1 overflow-y-auto p-6">
                            <KnowledgeIngester profileId={profileId!} memories={memories} onRefresh={() => loadMemories(profileId!)} />
                        </div>
                    </div>
                </div>
            )}

            {showBlockPanel && <BlockListManager profileId={profileId!} onClose={() => setShowBlockPanel(false)} onUnblock={(id) => { setBlockedIds(prev => prev.filter(bid => bid !== id)); addLog(`[SÉCURITÉ] Exclusion levée pour ${id.slice(0, 8)}.`); }} />}
        </main>
    );
}

// --- SOUS-COMPOSANTS (MODERNISÉS) ---

function BlockListManager({ profileId, onClose, onUnblock }: { profileId: string, onClose: () => void, onUnblock: (id: string) => void }) {
    const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBlocked = async () => {
            const { data: blocks } = await supabase.from('BlockList').select('blockedId').eq('blockerId', profileId);
            if (!blocks || blocks.length === 0) { setBlockedUsers([]); setLoading(false); return; }
            const { data: profiles } = await supabase.from('Profile').select('*').in('id', blocks.map(b => b.blockedId));
            setBlockedUsers(profiles || []);
            setLoading(false);
        };
        fetchBlocked();
    }, [profileId]);

    const handleUnblock = async (blockedId: string) => {
        await supabase.from('BlockList').delete().eq('blockerId', profileId).eq('blockedId', blockedId);
        setBlockedUsers(prev => prev.filter(u => u.id !== blockedId));
        onUnblock(blockedId);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-[#09090b] border border-red-500/20 rounded-3xl relative overflow-hidden flex flex-col shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-red-500/5">
                    <h2 className="text-red-400 font-bold uppercase text-sm flex items-center gap-3"><ShieldX size={20} /> Zone de Confinement</h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white rounded-full transition-colors"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-3">
                    {loading ? <div className="flex justify-center"><Loader2 className="animate-spin text-red-500" /></div> : blockedUsers.length === 0 ?
                        <p className="text-center text-slate-600 py-10 uppercase text-xs tracking-widest font-bold">Aucune menace active.</p> :
                        blockedUsers.map(user => (
                            <div key={user.id} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between hover:border-red-500/30 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500 font-bold border border-red-500/20">{user.name ? user.name.charAt(0) : '?'}</div>
                                    <div>
                                        <h4 className="text-slate-200 font-bold text-sm">{user.name || 'Inconnu'}</h4>
                                        <p className="text-[10px] text-slate-500 font-mono">ID: {user.id.slice(0, 12)}...</p>
                                    </div>
                                </div>
                                <button onClick={() => handleUnblock(user.id)} className="px-3 py-2 bg-white/5 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30 border border-transparent text-slate-400 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-2"><Unlock size={14} /> Libérer</button>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}

function InterceptorInterface({ interventions, onAnalyze, onAccept, onBlock, onIgnore, onRefresh }: any) {
    if (interventions.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 relative z-10">
            <div className="w-40 h-40 border border-dashed border-white/10 rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite] mb-6">
                <div className="w-32 h-32 border border-dashed border-white/10 rounded-full flex items-center justify-center animate-[spin_8s_linear_infinite_reverse]">
                    <Search size={40} className="opacity-30 text-cyan-500" />
                </div>
            </div>
            <p className="text-xs uppercase tracking-[0.3em] font-bold opacity-40 text-center mb-8">Secteur Sécurisé<br />En attente de scan</p>
            {/* BOUTON DANS L'INTERFACE DU MILIEU AUSSI EN AMBRE POUR LA COHÉRENCE */}
            <button onClick={onRefresh} className="group relative px-8 py-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-black text-amber-400 hover:bg-amber-500 hover:text-black transition-all uppercase shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] tracking-widest overflow-hidden">
                <span className="relative z-10 flex items-center gap-2"><Radar size={14} /> Initialiser Radar</span>
                <div className="absolute inset-0 bg-amber-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-0" />
            </button>
        </div>
    );

    const item = interventions[0];

    if (item.viewMode === 'SUMMARY') {
        return (
            <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
                <div className="relative bg-[#0a0a0a]/80 border border-white/10 p-8 rounded-[2rem] shadow-2xl text-center max-w-lg w-full backdrop-blur-xl">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-[#0a0a0a] border border-white/10 rounded-full flex items-center justify-center p-2">
                        <div className="w-full h-full bg-cyan-950/30 rounded-full flex items-center justify-center border border-cyan-500/30 animate-pulse relative">
                            <div className="absolute inset-0 rounded-full border-t border-cyan-400 animate-spin" />
                            <Radar size={32} className="text-cyan-400" />
                        </div>
                    </div>

                    <h2 className="mt-10 text-2xl font-black text-white uppercase tracking-tight">Signal Détecté</h2>
                    <p className="text-[10px] font-mono text-cyan-500 mb-8 uppercase tracking-widest bg-cyan-950/20 py-1 px-3 rounded-full inline-block mt-2">ID: {item.targetId.slice(0, 8)}</p>

                    <div className="text-left bg-white/5 p-5 rounded-2xl border border-white/5 mb-8 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider">Cible</span>
                                <p className="text-base text-white font-bold">{item.targetName}</p>
                            </div>
                            <div className="bg-slate-800 text-[9px] text-slate-300 px-2 py-1 rounded font-mono">Inconnu</div>
                        </div>
                        <div>
                            <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider">Aperçu Bio</span>
                            <p className="text-xs text-slate-400 italic leading-relaxed mt-1">"{item.bio}"</p>
                        </div>
                        <div>
                            <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider">Compétences</span>
                            <div className="flex flex-wrap gap-2 mt-1.5">
                                {item.knowledge.slice(0, 3).map((k: any, i: number) => (
                                    <span key={i} className="px-2 py-1 bg-black/50 rounded-md text-[9px] text-cyan-400 border border-white/5">{k.substring(0, 15)}...</span>
                                ))}
                                {item.knowledge.length === 0 && <span className="text-[9px] text-slate-600">Données insuffisantes.</span>}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onIgnore} className="flex-1 py-4 rounded-xl border border-white/10 bg-white/5 text-slate-400 font-bold uppercase text-[10px] hover:bg-white/10 hover:text-white transition-all">Ignorer</button>
                        <button onClick={() => onAnalyze(item.id)} className="flex-[2] py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase text-xs shadow-[0_0_25px_rgba(8,145,178,0.3)] hover:shadow-[0_0_40px_rgba(8,145,178,0.5)] transition-all flex items-center justify-center gap-2 group">
                            <Eye size={16} className="group-hover:scale-110 transition-transform" /> Audit Profond
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (item.viewMode === 'DEEP_AUDIT') {
        const scoreColor = item.matchScore > 75 ? 'text-green-400' : item.matchScore > 50 ? 'text-yellow-400' : 'text-red-400';
        const ringColor = item.matchScore > 75 ? 'border-green-500' : item.matchScore > 50 ? 'border-yellow-500' : 'border-red-500';

        return (
            <div className="h-full flex flex-col animate-in slide-in-from-right-8 duration-500">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 font-black text-2xl shadow-[0_0_15px_rgba(6,182,212,0.1)]">{item.targetName.charAt(0)}</div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">{item.targetName}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_lime]" />
                                <span className="text-[10px] font-mono text-green-500 uppercase tracking-widest">Dossier Complet</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onIgnore} className="p-2 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                    {/* SCORE & ANALYSE */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center relative shadow-inner">
                            <div className={`w-20 h-20 rounded-full border-4 ${ringColor} flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] bg-black/50`}>
                                <span className={`text-xl font-black ${scoreColor}`}>{item.matchScore}%</span>
                            </div>
                            <p className="mt-3 text-[9px] font-black uppercase text-slate-500 tracking-widest">Compatibilité</p>
                        </div>

                        <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-transparent border border-white/5 p-6 rounded-2xl">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Zap size={14} className="text-yellow-400" /> Opportunités Stratégiques
                            </h4>
                            <ul className="space-y-3">
                                {item.opportunities.map((op: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3 text-xs text-slate-300">
                                        <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                                        {op}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <section className="bg-white/5 rounded-2xl p-5 border border-white/5">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Activity size={12} /> Flux de Pensées</h4>
                            <ul className="space-y-2">
                                {item.thoughts.map((t: string, i: number) => <li key={i} className="text-[10px] text-slate-300 bg-black/40 border border-white/5 p-2 rounded-lg border-l-2 border-l-cyan-500">{t}</li>)}
                                {item.thoughts.length === 0 && <li className="text-[10px] text-slate-600 italic">Aucune donnée cérébrale.</li>}
                            </ul>
                        </section>
                        <section className="bg-white/5 rounded-2xl p-5 border border-white/5">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><BrainCircuit size={12} /> Base de Connaissances</h4>
                            <div className="flex flex-wrap gap-2">
                                {item.knowledge.map((k: string, i: number) => <span key={i} className="px-2 py-1 bg-black/40 border border-white/5 rounded text-[9px] text-cyan-400 font-mono">{k.substring(0, 20)}...</span>)}
                            </div>
                        </section>
                    </div>
                </div>

                <div className="mt-4 pt-6 border-t border-white/10 flex flex-col md:flex-row gap-3">
                    <button onClick={() => onBlock(item.targetId)} className="px-6 py-4 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold uppercase text-[10px] transition-all flex items-center justify-center gap-2"><Ban size={16} /> Bloquer</button>
                    <button onClick={() => onAccept(item.targetId)} className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:shadow-[0_0_30px_rgba(8,145,178,0.6)] transition-all flex items-center justify-center gap-2">
                        <CheckCircle size={18} /> Établir Liaison
                    </button>
                </div>
            </div>
        );
    }
    return null;
}