'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Radar, Loader2, BrainCircuit, X, ShieldAlert, ShieldX, Radio, Send, Upload, ChevronRight, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

// Components
import SecureWhatsApp from '@/components/SecureWhatsApp';

import KnowledgeIngester from '@/components/cortex/KnowledgeIngester';
import { NeuralLink } from '@/components/NeuralLink';
import Scanner from '@/components/dashboard/Scanner';
import TacticalGlobe from '@/components/Globe';
import MatchOverlay from '@/components/dashboard/MatchOverlay';
import DeepAuditReport from '@/components/dashboard/DeepAuditReport';
import StrategicListOverlay from '@/components/dashboard/StrategicListOverlay';
import { generateTacticalAudit } from '@/app/actions/generate-audit';
import { scanGlobalNetwork } from '@/app/actions/scan-global-network';

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

const mockDeepAudit = {
    identity: {
        name: "Cible Alpha",
        role: "Full Stack Architect",
        clearance: "LEVEL 4",
        lastActive: "14min ago",
    },
    scores: {
        match: 89,
        reliability: 94,
        influence: 72,
    },
    psyche: [
        { trait: "Openness", value: 90, label: "Visionary" },
        { trait: "Conscientiousness", value: 85, label: "Disciplined" },
        { trait: "Neuroticism", value: 12, label: "Stable" },
    ],
    network: [
        "Connecté au Cluster 'React Core'",
        "Accès confirmé : 3 investisseurs",
        "Pont potentiel vers 'Silicon Valley Node'",
    ],
    risks: [
        "Divergence politique mineure (2%)",
        "Localisation instable (Nomade)",
    ]
};

export default function MissionControl() {
    const router = useRouter();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [memories, setMemories] = useState<any[]>([]);
    const [logs, setLogs] = useState<string[]>([]);

    // New Tactical States
    const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'LOCKED' | 'AUDIT' | 'LIST'>('IDLE');
    const [matchData, setMatchData] = useState<any>(null);
    const [strategicReport, setStrategicReport] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

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
        setStatus('SCANNING');
        setMatchData(null);
        setStrategicReport(null);
        addLog("RADAR: Scan global initié...");

        try {
            const report = await scanGlobalNetwork(profileId);
            console.log("📝 RAPPORT MISTRAL REÇU:", report); // Debug Log

            setStrategicReport(report);

            // On affiche TOUJOURS le rapport, même s'il n'y a pas d'opportunités, 
            // pour voir le résumé de l'analyse et le statut global.
            setStatus('LIST');

            if (report.opportunities && report.opportunities.length > 0) {
                addLog(`CONTACT: ${report.opportunities.length} vecteurs identifiés.`);
            } else {
                addLog("RADAR: Analyse terminée (Aucune cible immédiate).");
            }
        } catch (e) {
            console.error(e);
            setStatus('IDLE');
            addLog("ERREUR: Échec du scan.");
        }
    };

    const handleSelectOpportunity = async (opp: any) => {
        if (!profileId) return;
        setIsAnalyzing(true);
        addLog(`CORTEX: Analyse tactique de ${opp.targetName}...`);

        try {
            const aiAudit = await generateTacticalAudit(opp.targetId, profileId);
            setMatchData({
                ...aiAudit,
                targetId: opp.targetId,
                name: opp.targetName,
                identity: { ...aiAudit.identity, name: opp.targetName }
            });
            setStatus('AUDIT');
        } catch (e) {
            addLog("ERREUR: Analyse détaillée échouée.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAction = async (action: 'LINK' | 'BLOCK' | 'CANCEL') => {
        if (!matchData) return;

        if (action === 'LINK') {
            await supabase.from('Channel').insert({ member_one_id: profileId, member_two_id: matchData.targetId, topic: "LIAISON SÉCURISÉE", last_message_at: new Date().toISOString(), initiatorId: profileId });
            addLog("LIAISON: Établie.");
        } else if (action === 'BLOCK') {
            await supabase.from('BlockList').insert({ blockerId: profileId, blockedId: matchData.targetId });
            setBlockedIds(prev => [...prev, matchData.targetId]);
            addLog("SÉCURITÉ: Cible bannie.");
        }

        setStatus('IDLE');
        setMatchData(null);
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
            {/* Background Elements (TACTICAL GLOBE) */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <TacticalGlobe
                    mode={status === 'LIST' ? 'LOCKED' : status}
                    targetCoordinates={(status === 'LOCKED' || status === 'LIST') ? [48.8566, 2.3522] : null}
                />
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

                    {/* CENTRAL NEURAL MAP (Scanner & Overlays) */}
                    <div className="glass-panel rounded-2xl p-1 relative overflow-visible flex flex-col items-center justify-center group min-h-[250px]">

                        {/* ÉTAT 1 : SCANNER (Visible si IDLE ou SCANNING) */}
                        {(status === 'IDLE' || status === 'SCANNING') && (
                            <div className={`transition-all duration-500 w-full ${status === 'SCANNING' ? 'opacity-80 pointer-events-none' : 'opacity-100'}`}>
                                <Scanner onScanStart={triggerManualScan} />
                                {status === 'SCANNING' && (
                                    <p className="text-center text-cyan-400 mt-2 animate-pulse font-mono text-xs">
                                        TRIANGULATION EN COURS...
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ÉTAT 2 : LISTE STRATEGIQUE (Global Scan Result) */}
                        {status === 'LIST' && strategicReport && (
                            <div className="absolute inset-0 z-20 flex flex-col p-4 w-full h-full bg-black/95 backdrop-blur-xl overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-300">
                                <button
                                    onClick={() => setStatus('IDLE')}
                                    className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white"
                                >
                                    <X size={24} />
                                </button>

                                <div className="mt-4 space-y-6">
                                    {/* Header du Rapport */}
                                    <div className={`p-4 border-l-4 bg-white/5 ${strategicReport.globalStatus === 'ORANGE' ? 'border-orange-500' : 'border-emerald-500'}`}>
                                        <h2 className="text-xl font-bold tracking-tighter uppercase text-white">
                                            Statut Global : <span className={strategicReport.globalStatus === 'ORANGE' ? 'text-orange-500' : 'text-emerald-500'}>
                                                {strategicReport.globalStatus}
                                            </span>
                                        </h2>
                                        <p className="text-gray-400 italic text-sm mt-2">{strategicReport.analysisSummary}</p>
                                    </div>

                                    {/* Liste des Opportunités */}
                                    <div className="grid gap-3 pb-8">
                                        {strategicReport.opportunities.map((op: any, index: number) => (
                                            <div
                                                key={index}
                                                onClick={() => handleSelectOpportunity(op)}
                                                className="p-4 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all cursor-pointer group rounded-lg"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="text-lg font-semibold text-blue-400 group-hover:text-primary transition-colors">{op.targetName}</h3>
                                                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-mono rounded border border-blue-500/30">
                                                        MATCH: {op.matchScore}%
                                                    </span>
                                                </div>

                                                <div className="space-y-3 text-sm">
                                                    <p><span className="text-gray-500 uppercase font-bold text-xs">Analyse :</span> <span className="text-slate-300">{op.reason}</span></p>
                                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded">
                                                        <p className="text-emerald-400">
                                                            <span className="font-bold uppercase text-xs">Action suggérée :</span> {op.suggestedAction}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {strategicReport.opportunities.length === 0 && (
                                            <div className="text-center py-8 text-gray-500 italic">
                                                Aucune opportunité détectée pour le moment.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ÉTAT 3 : MATCH LOCKED (Legacy/Single Audit - kept for compatibility if needed, but not reached via scanGlobalNetwork) */}
                        {status === 'LOCKED' && matchData && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center p-2">
                                <MatchOverlay
                                    data={matchData}
                                    onAudit={async () => {
                                        // Legacy path if we ever manually set LOCKED
                                        if (matchData.targetId) handleSelectOpportunity({ targetId: matchData.targetId, targetName: matchData.name });
                                    }}
                                    onCancel={() => { setStatus('IDLE'); setMatchData(null); }}
                                />
                            </div>
                        )}

                        {isDragging && (
                            <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-2 border-primary border-dashed m-2 rounded-xl">
                                <Upload className="text-primary animate-bounce" size={32} />
                                <p className="text-xs font-bold text-white mt-2">INGESTION DONNÉES</p>
                            </div>
                        )}
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

                        <button onClick={triggerManualScan} className="flex items-center justify-center -mt-8 mx-2 group" disabled={isAnalyzing}>
                            <div className="w-16 h-16 rounded-full bg-surface-dark border border-primary/50 shadow-[0_0_20px_rgba(19,200,236,0.3)] flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform">
                                {(status === 'SCANNING' || isAnalyzing) && <div className="absolute inset-0 border-2 border-primary/30 rounded-full border-t-primary animate-spin"></div>}
                                <Radar className={`relative z-10 ${(status === 'SCANNING' || isAnalyzing) ? 'text-accent-amber' : 'text-primary'}`} size={28} />
                            </div>
                        </button>

                        <button onClick={() => setShowCortexPanel(true)} className="flex-1 flex flex-col items-center gap-1 py-1 group active:scale-95">
                            <div className="w-10 h-10 rounded-xl bg-transparent group-hover:bg-primary/20 flex items-center justify-center text-gray-400 group-hover:text-primary transition-all">
                                <BrainCircuit size={20} />
                            </div>
                        </button>
                    </div>
                </div>
            </div >

            {/* MODALS */}
            {
                isChatOpen && activeChannelId && (
                    <div className="fixed inset-0 z-[100] bg-black animate-in slide-in-from-bottom">
                        <button onClick={() => setIsChatOpen(false)} className="absolute top-4 right-4 z-50 p-2 bg-white/10 rounded-full text-white"><X /></button>
                        <SecureWhatsApp profileId={profileId} channelId={activeChannelId} />
                    </div>
                )
            }

            {
                showCortexPanel && (
                    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl p-4 flex flex-col animate-in fade-in">
                        <button onClick={() => setShowCortexPanel(false)} className="self-end p-2 text-white mb-2"><X /></button>
                        <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black">
                            <KnowledgeIngester profileId={profileId!} memories={memories} onRefresh={() => loadMemories(profileId!)} />
                        </div>
                    </div>
                )
            }

            {showBlockPanel && <BlockListManager profileId={profileId!} onClose={() => setShowBlockPanel(false)} />}

            {/* ÉTAT 3 : AUDIT COMPLET (FullScreen Overlay) */}
            {
                status === 'AUDIT' && matchData && (
                    <DeepAuditReport
                        data={matchData}
                        onAction={handleAction}
                    />
                )
            }
        </div >
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

// InterceptorInterface removed as it is replaced by Scanner/MatchOverlay/AuditReport logic