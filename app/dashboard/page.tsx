'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Radar, Loader2, BrainCircuit, X, ShieldAlert, ShieldX, Radio, Send, Upload, ChevronRight, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

// Components
import SecureWhatsApp from '@/components/SecureWhatsApp';

import KnowledgeIngester from '@/components/cortex/KnowledgeIngester';
import { NeuralLink } from '@/components/NeuralLink';

// --- LOGIQUE METIER (INCHANGÉE) ---
const calculateSynergy = (target: any, memories: any[]) => {
    let score = 45;
    if (target.bio && target.bio.length > 20) score += 15;
    if (memories.length > 0) score += 10;
    if (memories.some(m => m.type === 'knowledge')) score += 15;
    score += Math.floor(Math.random() * 15) - 5;
    score = Math.min(98, Math.max(12, score));
    const opportunities = [];
    const fullText = (target.bio + " " + memories.map(m => m.content).join(" ")).toLowerCase();
    if (fullText.includes("recherche") || fullText.includes("besoin")) opportunities.push("Demande active.");
    if (fullText.includes("expert") || fullText.includes("senior")) opportunities.push("Expertise technique.");
    if (opportunities.length === 0) opportunities.push("Exploration requise.");
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
    const [showCortexPanel, setShowCortexPanel] = useState(false);
    const [showBlockPanel, setShowBlockPanel] = useState(false);

    // États Ingestion
    const [quickThought, setQuickThought] = useState("");
    const [isDragging, setIsDragging] = useState(false);

    const [unreadIds, setUnreadIds] = useState<string[]>([]);
    const [interventions, setInterventions] = useState<any[]>([]);
    const [blockedIds, setBlockedIds] = useState<string[]>([]);

    const addLog = (message: string) => setLogs(prev => [`> ${new Date().toLocaleTimeString().slice(0, 5)} ${message}`, ...prev].slice(0, 10));

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

    // Écouteur Global
    useEffect(() => {
        if (!profileId) return;
        const channelSubscription = supabase.channel('global_dashboard_main')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Channel' }, async (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newChannel = payload.new as any;
                    if (newChannel.member_one_id === profileId || newChannel.member_two_id === profileId) {
                        addLog(`NOUVELLE LIAISON: ${newChannel.id.slice(0, 4)}`);
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

    const loadMemories = async (pid: string) => {
        const res = await fetch(`/api/memories?profileId=${pid}`);
        const data = await res.json();
        if (data.memories) setMemories(data.memories);
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) await handleFileUpload(e.dataTransfer.files[0]);
    };

    const handleFileUpload = async (file: File) => {
        if (!profileId) return;
        addLog(`ANALYSE: ${file.name}`);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('profileId', profileId);
        try {
            const res = await fetch('/api/sensors/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) { addLog(`SUCCÈS: Données ingérées.`); loadMemories(profileId); }
            else { addLog(`ERREUR: Échec lecture.`); }
        } catch (err) { addLog(`CRITIQUE: Erreur upload.`); }
    };

    const handleQuickThoughtSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!quickThought.trim() || !profileId) return;
        const content = quickThought;
        setQuickThought("");
        addLog(`MEMOIRE: Archivage...`);
        await supabase.from('Memory').insert({ profileId, content, type: 'thought', source: 'manual_input' });
        addLog(`SUCCÈS: Pensée stockée.`);
        loadMemories(profileId);
    };

    const triggerManualScan = async () => {
        if (!profileId) return;
        setIsScanning(true);
        setInterventions([]);
        addLog("RADAR: Triangulation...");
        setTimeout(async () => {
            const { data: blocks } = await supabase.from('BlockList').select('blockedId').eq('blockerId', profileId);
            const currentBlockedIds = blocks?.map(b => b.blockedId) || [];
            setBlockedIds(currentBlockedIds);
            const { data: targets } = await supabase.from('Profile').select('*').neq('id', profileId).not('id', 'in', `(${currentBlockedIds.length > 0 ? currentBlockedIds.join(',') : '00000000-0000-0000-0000-000000000000'})`).limit(1);

            if (targets && targets.length > 0) {
                const target = targets[0];
                const { data: intel } = await supabase.from('Memory').select('*').eq('profileId', target.id);
                const analysis = calculateSynergy(target, intel || []);
                setInterventions([{
                    id: `scan-${Date.now()}`, viewMode: 'SUMMARY',
                    targetName: target.name || 'Inconnu', targetId: target.id, bio: target.bio,
                    thoughts: intel?.filter(m => m.type === 'thought').map(m => m.content) || [],
                    knowledge: intel?.filter(m => m.type === 'knowledge').map(m => m.content) || [],
                    matchScore: analysis.score, opportunities: analysis.opportunities
                }]);
                addLog(`CONTACT: ${analysis.score}% Match`);
            } else { addLog(`RADAR: Aucune cible.`); }
            setIsScanning(false);
        }, 1500);
    };

    const handleAnalyze = (scanId: string) => setInterventions(prev => prev.map(item => item.id === scanId ? { ...item, viewMode: 'DEEP_AUDIT' } : item));
    const handleAcceptConnection = async (targetId: string) => {
        await supabase.from('Channel').insert({ member_one_id: profileId, member_two_id: targetId, topic: "LIAISON SÉCURISÉE", last_message_at: new Date().toISOString(), initiatorId: profileId });
        setInterventions([]); addLog("LIAISON: Établie.");
    };
    const handleBlock = async (targetId: string) => {
        if (!confirm("Confirmer le ban ?")) return;
        await supabase.from('BlockList').insert({ blockerId: profileId, blockedId: targetId });
        setBlockedIds(prev => [...prev, targetId]); setInterventions([]); addLog("SÉCURITÉ: Cible bannie.");
    };
    const toggleChannelChat = (id: string) => { setActiveChannelId(id); setIsChatOpen(true); setUnreadIds(prev => prev.filter(uid => uid !== id)); };

    const handleDeleteChannel = async (channelId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Empêche d'ouvrir le chat quand on clique sur supprimer

        // Petit son ou effet tactique serait bien ici, mais on reste simple
        if (!confirm("CONFIRMATION REQUISE : Rompre définitivement cette liaison sécurisée ?")) return;

        // Mise à jour optimiste de l'interface (immédiat)
        setChannels(prev => prev.filter(c => c.id !== channelId));
        addLog(`TERMINATION: Liaison ${channelId.slice(0, 4)} rompue.`);

        // Suppression en base de données
        const { error } = await supabase.from('Channel').delete().eq('id', channelId);

        if (error) {
            addLog("ERREUR: Échec de la rupture du lien.");
            // Si erreur, on recharge la liste pour remettre le channel
            if (profileId) fetchChannels(profileId);
        }
    };

    if (!isInitialized) return <div className="h-screen bg-black flex items-center justify-center text-primary"><Loader2 className="animate-spin" /></div>;

    return (
        <div
            className="bg-background-dark text-slate-300 font-display h-[100dvh] w-full overflow-hidden flex flex-col relative touch-none"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Background Elements (SCANLINE RETIRÉE) */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern bg-[length:40px_40px] opacity-10"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px]"></div>
            </div>

            <div className="relative z-10 flex flex-col h-full w-full max-w-md mx-auto bg-black/20 border-x border-white/5 shadow-2xl">
                {/* Header */}
                <header className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top,1.5rem)] pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_15px_rgba(19,200,236,0.2)]">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold tracking-wider text-primary text-glow">COMMAND_NODE</h1>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary breathing-dot"></span>
                                <span className="text-[10px] text-gray-400 font-mono tracking-widest">ONLINE</span>
                            </div>
                        </div>
                    </div>
                    <div className="glass-panel px-3 py-1 rounded-full flex items-center gap-2">
                        <span className="text-xs font-mono text-primary animate-pulse">SECURE</span>
                    </div>
                </header>

                {/* Main Dashboard Area */}
                <main className="flex-1 flex flex-col px-4 gap-4 overflow-y-auto no-scrollbar pb-32">

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="glass-panel rounded-xl p-2 flex flex-col items-center justify-center border-t-2 border-t-primary/50">
                            <span className="text-[8px] text-gray-400 tracking-wider">CPU</span>
                            <span className="text-lg font-bold font-mono text-white">34%</span>
                        </div>
                        <div className="glass-panel rounded-xl p-2 flex flex-col items-center justify-center border-t-2 border-t-accent-amber/50">
                            <span className="text-[8px] text-gray-400 tracking-wider">MEM</span>
                            <span className="text-lg font-bold font-mono text-accent-amber text-glow-amber">89%</span>
                        </div>
                        <div className="glass-panel rounded-xl p-2 flex flex-col items-center justify-center border-t-2 border-t-primary/50">
                            <span className="text-[8px] text-gray-400 tracking-wider">NET</span>
                            <span className="text-lg font-bold font-mono text-white">4TB</span>
                        </div>
                    </div>

                    {/* CENTRAL NEURAL MAP (Avec le Nouveau Globe) */}
                    <div className="glass-panel rounded-2xl p-1 relative overflow-hidden aspect-square flex items-center justify-center group">
                        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-primary/50"></div>
                        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-primary/50"></div>

                        <div className="relative w-full h-full rounded-xl overflow-hidden bg-black/40 flex flex-col">
                            {interventions.length > 0 || isScanning ? (
                                <div className="flex-1 p-2">
                                    <InterceptorInterface
                                        interventions={interventions}
                                        onAnalyze={handleAnalyze}
                                        onAccept={handleAcceptConnection}
                                        onBlock={handleBlock}
                                        onIgnore={() => setInterventions([])}
                                        onRefresh={triggerManualScan}
                                    />
                                </div>
                            ) : (
                                /* Mode Veille avec Globe Holographique CSS */
                                <NeuralLink />
                            )}

                            {isDragging && (
                                <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-2 border-primary border-dashed m-2 rounded-xl">
                                    <Upload className="text-primary animate-bounce" size={32} />
                                    <p className="text-xs font-bold text-white mt-2">INGESTION DONNÉES</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Channels List */}
                    <div className="glass-panel rounded-xl p-4 flex flex-col gap-3 min-h-[120px]">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <h3 className="text-xs text-accent-amber font-bold tracking-widest flex items-center gap-2">
                                <Radio size={12} /> CHANNELS ({channels.length})
                            </h3>
                        </div>
                        <div className="space-y-2 overflow-y-auto max-h-32 custom-scrollbar">
                            {channels.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => toggleChannelChat(c.id)}
                                    className="flex items-center justify-between p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer group transition-all border border-transparent hover:border-primary/20"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${unreadIds.includes(c.id) ? 'bg-accent-amber animate-pulse' : 'bg-primary/50'}`}></div>
                                        <span className="text-[10px] font-mono text-slate-300 truncate">{c.topic}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Bouton de suppression (visible au hover ou tactile) */}
                                        <button
                                            onClick={(e) => handleDeleteChannel(c.id, e)}
                                            className="p-3 -m-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100 active:opacity-100 active:scale-90"
                                            title="Rompre la liaison"
                                        >
                                            <Trash2 size={14} />
                                        </button>

                                        <ChevronRight size={12} className="text-gray-500 group-hover:text-white transition-colors" />
                                    </div>
                                </div>
                            ))}
                            {channels.length === 0 && <p className="text-[10px] text-gray-600 italic text-center py-2">Aucun signal.</p>}
                        </div>
                    </div>

                    {/* Terminal Logs */}
                    <div className="glass-panel rounded-xl p-3 flex flex-col gap-2 h-32">
                        <h3 className="text-[9px] text-gray-500 font-bold tracking-widest uppercase mb-1">System Log</h3>
                        <div className="font-mono text-[9px] space-y-1 text-primary/80 overflow-y-auto custom-scrollbar flex-1">
                            {logs.map((l, i) => <div key={i} className="border-l border-primary/20 pl-2">{l}</div>)}
                        </div>
                    </div>

                    {/* Input Pensée Rapide */}
                    <form onSubmit={handleQuickThoughtSubmit} className="glass-panel rounded-full p-1 flex items-center gap-2 pl-4">
                        <input
                            type="text"
                            value={quickThought}
                            onChange={e => setQuickThought(e.target.value)}
                            placeholder="Saisir pensée rapide..."
                            className="bg-transparent border-none text-base md:text-xs text-white focus:ring-0 flex-1 placeholder:text-gray-600"
                        />
                        <button type="submit" className="p-2 bg-primary/20 rounded-full text-primary hover:bg-primary hover:text-black transition-colors active:scale-90">
                            <Send size={14} />
                        </button>
                    </form>

                </main>

                {/* Bottom Navigation Dock */}
                <div className="absolute bottom-6 left-4 right-4 z-50 pb-[env(safe-area-inset-bottom)]">
                    <div className="glass-panel rounded-2xl p-2 flex items-center justify-between shadow-2xl bg-black/90">
                        <button onClick={() => setShowBlockPanel(true)} className="flex-1 flex flex-col items-center gap-1 py-1 group active:scale-95">
                            <div className="w-10 h-10 rounded-xl bg-transparent group-hover:bg-red-500/20 flex items-center justify-center text-gray-400 group-hover:text-red-500 transition-all">
                                <ShieldX size={20} />
                            </div>
                        </button>

                        <button onClick={triggerManualScan} className="flex items-center justify-center -mt-8 mx-2 group">
                            <div className="w-16 h-16 rounded-full bg-surface-dark border border-primary/50 shadow-[0_0_20px_rgba(19,200,236,0.3)] flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform">
                                {isScanning && <div className="absolute inset-0 border-2 border-primary/30 rounded-full border-t-primary animate-spin"></div>}
                                <Radar className={`relative z-10 ${isScanning ? 'text-accent-amber' : 'text-primary'}`} size={28} />
                            </div>
                        </button>

                        <button onClick={() => setShowCortexPanel(true)} className="flex-1 flex flex-col items-center gap-1 py-1 group active:scale-95">
                            <div className="w-10 h-10 rounded-xl bg-transparent group-hover:bg-primary/20 flex items-center justify-center text-gray-400 group-hover:text-primary transition-all">
                                <BrainCircuit size={20} />
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {isChatOpen && activeChannelId && (
                <div className="fixed inset-0 z-[100] bg-black animate-in slide-in-from-bottom">
                    <button onClick={() => setIsChatOpen(false)} className="absolute top-4 right-4 z-50 p-2 bg-white/10 rounded-full text-white"><X /></button>
                    <SecureWhatsApp profileId={profileId} channelId={activeChannelId} />
                </div>
            )}

            {showCortexPanel && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl p-4 flex flex-col animate-in fade-in">
                    <button onClick={() => setShowCortexPanel(false)} className="self-end p-2 text-white mb-2"><X /></button>
                    <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black">
                        <KnowledgeIngester profileId={profileId!} memories={memories} onRefresh={() => loadMemories(profileId!)} />
                    </div>
                </div>
            )}

            {showBlockPanel && <BlockListManager profileId={profileId!} onClose={() => setShowBlockPanel(false)} />}
        </div>
    );
}



// --- SOUS-COMPOSANTS EXISTANTS ---
function BlockListManager({ profileId, onClose }: any) {
    return (
        <div onClick={onClose} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#0f1618] p-6 rounded-2xl border border-red-900/50 w-80 shadow-2xl relative">
                <h2 className="text-red-500 font-bold mb-4 tracking-widest flex items-center gap-2"><ShieldX size={18} /> BLACKLIST</h2>
                <p className="text-xs text-slate-500 mb-6 font-mono">Liste de confinement vide.</p>
                <button className="w-full py-2 bg-red-900/20 text-red-500 border border-red-900/50 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all" onClick={onClose}>FERMER</button>
            </div>
        </div>
    );
}

function InterceptorInterface({ interventions, onAnalyze, onAccept, onIgnore }: any) {
    const item = interventions[0];
    if (item?.viewMode === 'SUMMARY') return (
        <div className="flex flex-col items-center justify-center min-h-[120px] h-auto w-full text-center p-2 animate-in zoom-in-95 relative z-50 transition-all duration-500 ease-out">
            <div className="w-full p-4 border border-primary/30 bg-black/60 backdrop-blur-md rounded-xl flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-3 relative">
                    <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin"></div>
                    <Radar size={20} className="text-primary" />
                </div>

                <p className="text-[10px] text-primary/70 mb-1 tracking-tighter uppercase font-mono">
                    [ SYSTÈME ] SIGNAL DÉTECTÉ
                </p>

                <div className="py-1 break-all font-mono text-primary text-lg font-bold leading-tight">
                    {item.targetName || "RECHERCHE..."}
                </div>

                <button
                    onClick={() => onAnalyze(item.id)}
                    className="mt-4 w-full h-14 bg-primary/20 border border-primary text-primary font-bold active:bg-primary/40 transition-all shadow-[0_0_15px_rgba(19,200,236,0.2)] rounded-xl flex items-center justify-center relative z-50 cursor-pointer uppercase tracking-widest text-xs touch-manipulation"
                >
                    ANALYSER
                </button>

                <button
                    onClick={onIgnore}
                    className="text-gray-500 text-[10px] mt-4 hover:text-white p-2 min-h-[40px] flex items-center justify-center w-full font-mono tracking-widest"
                >
                    IGNORER_SIGNAL
                </button>
            </div>
        </div>
    );
    if (item?.viewMode === 'DEEP_AUDIT') return (
        <div className="flex flex-col items-center justify-center min-h-[120px] h-auto w-full text-center p-2 animate-in slide-in-from-right relative z-50 transition-all">
            <div className="w-full p-6 border border-accent-amber/30 bg-black/60 backdrop-blur-md rounded-xl flex flex-col items-center">
                <h2 className="text-accent-amber font-bold text-sm tracking-[0.2em] mb-4 uppercase font-mono">
                    [ AUDIT_TERMINÉ ]
                </h2>

                <div className="relative mb-6">
                    <svg className="w-24 h-24 transform -rotate-90">
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-800" />
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * item.matchScore) / 100} className="text-accent-amber" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl font-black text-white font-mono">{item.matchScore}%</div>
                </div>

                <div className="flex flex-col gap-3 w-full">
                    <button
                        onClick={() => onAccept(item.targetId)}
                        className="w-full h-14 bg-accent-amber text-black rounded-xl font-bold text-xs hover:bg-white transition-all active:scale-95 shadow-[0_0_15px_rgba(255,176,32,0.3)] flex items-center justify-center relative z-50 cursor-pointer uppercase tracking-widest touch-manipulation"
                    >
                        CONNECTER
                    </button>

                    <button
                        onClick={onIgnore}
                        className="text-gray-500 text-[10px] hover:text-white p-2 min-h-[40px] flex items-center justify-center w-full font-mono tracking-widest"
                    >
                        ARCHIVER_DOSSIER
                    </button>
                </div>
            </div>
        </div>
    );
    return null;
}