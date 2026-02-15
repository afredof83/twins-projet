'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Radio, Send, Activity, CheckSquare, LogOut, Trash2, MessageCircle, RefreshCw,
    UploadCloud, Radar, Loader2, ShieldOff, BrainCircuit, X
} from 'lucide-react';
// On commente l'import dynamique pour l'instant
// import dynamic from 'next/dynamic';
// const ShadowGlobe = dynamic(() => import('@/components/shadow-globe'), { 
//     ssr: false,
//     loading: () => <div className="fixed inset-0 bg-slate-950" /> 
// });
import CommlinkButton from '@/components/CommlinkButton';
import GuardianFeed from '@/components/cortex/GuardianFeed';
import KnowledgeIngester from '@/components/cortex/KnowledgeIngester';
import SecureWhatsApp from '@/components/SecureWhatsApp';

const SFX = {
    PING: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c3943905c1.mp3',
    CONNECT: 'https://cdn.pixabay.com/audio/2022/03/24/audio_03e06c4b26.mp3',
    DELETE: 'https://cdn.pixabay.com/audio/2022/03/10/audio_5b38383796.mp3',
};

export default function MissionControl() {
    const router = useRouter();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [memories, setMemories] = useState<any[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [activeRequest, setActiveRequest] = useState<any>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);
    const [channels, setChannels] = useState<any[]>([]);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [neuroInput, setNeuroInput] = useState('');
    const [isPrivateMemory, setIsPrivateMemory] = useState(false);
    const [showCortexPanel, setShowCortexPanel] = useState(false);

    const [interventions, setInterventions] = useState<any[]>([]);

    const addLog = (message: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev].slice(0, 50));
    const playSFX = (url: string) => { if (audioEnabled) { try { new Audio(url).play().catch(() => { }); } catch (e) { } } };

    useEffect(() => {
        const init = async () => {
            const { createClient } = await import('@supabase/supabase-js');
            const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
            const { data: { user } } = await sb.auth.getUser();
            if (!user) { router.push('/'); return; }
            setProfileId(user.id);
            setIsInitialized(true);
            loadMemories(user.id);
            fetchChannels(user.id);
        };
        init();
    }, []);

    const fetchChannels = async (pid: string) => {
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data } = await sb.from('Channel').select('*').or(`member_one_id.eq.${pid},member_two_id.eq.${pid}`);
        if (data) setChannels(data);
    };

    const toggleChannelChat = (channelId: string, partnerId: string) => {
        if (activeChannelId === channelId && isChatOpen) {
            // Si on clique sur le canal déjà ouvert, on le ferme
            setIsChatOpen(false);
            setActiveChannelId(null);
            setChatPartnerId(null);
        } else {
            // Sinon, on ouvre le nouveau (ce qui ferme automatiquement l'ancien par le changement d'ID)
            setActiveChannelId(channelId);
            setChatPartnerId(partnerId);
            setIsChatOpen(true);
            addLog(`[COMM] Connexion au canal ${channelId.slice(0, 8)}`);
        }
    };

    const handleDeleteChannel = async (channelId: string) => {
        if (!confirm("Voulez-vous rompre cette liaison définitivement ?")) return;

        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

        const { error } = await sb.from('Channel').delete().eq('id', channelId);

        if (!error) {
            setChannels(prev => prev.filter(c => c.id !== channelId));
            addLog(`[SYSTÈME] Liaison ${channelId.slice(0, 8)} supprimée.`);
            playSFX(SFX.DELETE || 'https://cdn.pixabay.com/audio/2022/03/10/audio_5b38383796.mp3');
        } else {
            alert("Erreur lors de la suppression.");
        }
    };

    const handleLogout = async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        await sb.auth.signOut();
        router.push('/');
    };

    const triggerManualScan = async () => {
        if (!profileId) return;
        setIsScanning(true);
        try {
            const res = await fetch('/api/guardian/intervene', {
                method: 'POST',
                body: JSON.stringify({ profileId }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.intervention) {
                setInterventions([data.intervention]);
                playSFX(SFX.PING);
            }
        } finally { setIsScanning(false); }
    };

    const handleNeuroSave = async () => {
        if (!neuroInput.trim() || !profileId) return;
        const res = await fetch('/api/memories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: neuroInput, profileId, type: isPrivateMemory ? 'private' : 'thought' }),
        });
        if (res.ok) { setNeuroInput(''); loadMemories(profileId); }
    };

    const loadMemories = async (pid: string) => {
        const res = await fetch(`/api/memories?profileId=${pid}`);
        const data = await res.json();
        if (data.memories) setMemories(data.memories);
    };

    const handleFileUpload = async (file: File) => {
        if (!profileId) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('profileId', profileId);
        const res = await fetch('/api/sensors/upload', { method: 'POST', body: formData });
        if (res.ok) loadMemories(profileId);
    };

    if (!profileId || !isInitialized) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-mono"><Loader2 className="animate-spin text-cyan-500" size={40} /></div>;

    return (
        <main className="relative min-h-screen w-full bg-slate-950 text-white font-mono flex flex-col overflow-hidden">

            {/* WRAPPER PRINCIPAL (Z-10) */}
            <div className="flex-1 flex flex-col p-4 md:p-6 transition-all duration-500 z-10">

                {/* HEADER (déjà optimisé) */}
                <header className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6 border-b border-white/10 pb-4">
                    <div className="text-center lg:text-left">
                        <h1 className="text-2xl md:text-3xl font-black italic bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">MISSION CONTROL</h1>
                        <p className="text-[10px] text-slate-500 tracking-[0.3em] uppercase">Security Level: Maximum • {profileId?.slice(0, 8)}</p>
                    </div>

                    {/* BARRE DE BOUTONS RESPONSIVE */}
                    <div className="flex flex-wrap justify-center items-center gap-3">
                        <button
                            onClick={() => setShowCortexPanel(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-cyan-900/30 border border-cyan-500/50 text-cyan-400 rounded-xl hover:bg-cyan-500 hover:text-white transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                        >
                            <BrainCircuit size={18} />
                            <span className="hidden md:inline text-[10px] font-black uppercase">Cortex Data</span>
                        </button>

                        <button
                            onClick={triggerManualScan}
                            disabled={isScanning}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-cyan-500 transition-all"
                        >
                            {isScanning ? <Loader2 className="animate-spin" size={16} /> : <Radar size={16} />}
                            <span className="hidden md:inline">Scanner</span>
                        </button>

                        <CommlinkButton profileId={profileId} />

                        <button
                            onClick={() => router.push(`/dashboard/blocked?profileId=${profileId}`)}
                            className="p-2 bg-red-950/20 border border-red-900/30 text-red-500 rounded-xl hover:bg-red-900/40 transition-all"
                            title="Ban List"
                        >
                            <ShieldOff size={18} />
                        </button>

                        <button
                            onClick={handleLogout}
                            className="p-2 bg-red-950/30 border border-red-900/50 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-lg"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </header>

                {/* GRILLE CENTRALE (Audit + Liaisons) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

                    {/* AUDIT MATRIX (65% Largeur) */}
                    <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800 rounded-3xl flex flex-col h-[500px] shadow-2xl overflow-hidden">
                        <div className="p-3 bg-zinc-900/50 border-b border-white/5 flex justify-between items-center">
                            <span className="text-[10px] font-black text-cyan-500 tracking-widest uppercase flex items-center gap-2">
                                <Activity size={14} className="text-cyan-500 animate-pulse" /> SYSTÈME D'AUDIT ACTIF
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <GuardianFeed interventions={interventions} profileId={profileId} onClear={() => setInterventions([])} onRefresh={triggerManualScan} />
                        </div>
                        <div className="p-3 bg-black/40 border-t border-white/5 flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-cyan-500 text-slate-300 placeholder:text-slate-600"
                                placeholder="Ordre d'audit..."
                            />
                            <button className="bg-cyan-600 p-2 rounded-xl text-white hover:bg-cyan-500 transition-all"><Send size={18} /></button>
                        </div>
                    </div>

                    {/* LIAISONS (35% Largeur) - ACCORDÉON */}
                    <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-5 flex flex-col h-full shadow-xl">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase mb-4 flex items-center gap-2">
                            <Radio size={14} className="text-cyan-500" /> LIAISONS SÉCURISÉES
                        </h3>
                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                            {channels.map((channel: any) => {
                                const isInitiator = channel.member_one_id === profileId;
                                const partnerId = isInitiator ? channel.member_two_id : channel.member_one_id;
                                const isOpen = activeChannelId === channel.id && isChatOpen;

                                return (
                                    <div key={channel.id} className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen ? 'border-cyan-500/50 bg-black' : 'border-white/5 bg-black/40'
                                        }`}>
                                        {/* EN-TÊTE DE LA LIAISON */}
                                        <div className="p-4 flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-mono text-slate-600 uppercase">ID:{partnerId?.slice(0, 8)}</span>
                                                <span className="text-[11px] font-bold text-slate-300">Liaison Directe</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => toggleChannelChat(channel.id, partnerId)}
                                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${isOpen ? 'bg-red-900/20 text-red-400 border border-red-500/30' : 'bg-zinc-800 text-white hover:bg-cyan-600'
                                                        }`}
                                                >
                                                    {isOpen ? 'Fermer' : 'Ouvrir Liaison'}
                                                </button>
                                                <button onClick={() => handleDeleteChannel(channel.id)} className="p-2 text-slate-700 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        </div>

                                        {/* LE CHAT EN ACCORDÉON (S'OUVRE ICI) */}
                                        {isOpen && (
                                            <div className="h-[450px] border-t border-white/10 animate-in slide-in-from-top duration-300">
                                                <SecureWhatsApp
                                                    profileId={profileId}
                                                    partnerId={chatPartnerId}
                                                    channelId={activeChannelId}
                                                    onClose={() => setIsChatOpen(false)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {channels.length === 0 && (
                                <div className="text-center py-10 opacity-20 text-[10px] uppercase">Aucune liaison active</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- PANNEAU DE LOGS D'AUDIT (Bas de page) --- */}
                <div className="mt-auto bg-black/60 border border-white/5 rounded-2xl p-4 h-40 overflow-hidden flex flex-col shadow-inner">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" /> HISTORIQUE DES ÉVÉNEMENTS
                        </span>
                        <span className="text-[8px] text-slate-700 font-mono">v2.1-STABLE</span>
                    </div>
                    <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1 text-slate-400 custom-scrollbar">
                        {logs.length > 0 ? logs.map((log, i) => (
                            <div key={i} className="border-l border-white/10 pl-2 py-0.5 hover:bg-white/5 transition-colors">
                                <span className="text-cyan-800 mr-2">{log.split(']')[0]}]</span>
                                {log.split(']')[1]}
                            </div>
                        )) : (
                            <div className="text-slate-700 italic">Aucune donnée système enregistrée...</div>
                        )}
                    </div>
                </div>
            </div>



            {/* CORTEX MODAL */}
            {showCortexPanel && (
                <div className="fixed inset-0 z-[2147483647] bg-black/80 backdrop-blur-xl flex items-center justify-center p-0 md:p-4">
                    <div className="bg-slate-900 border-t md:border border-white/10 w-full h-full md:h-auto md:max-w-4xl md:max-h-[90vh] md:rounded-3xl overflow-hidden flex flex-col">
                        <div className="p-6 flex justify-between items-center border-b border-white/10 bg-zinc-900/50">
                            <h2 className="text-lg font-bold flex items-center gap-3 text-cyan-400"><BrainCircuit /> CORTEX DATA</h2>
                            <button onClick={() => setShowCortexPanel(false)} className="p-2 hover:bg-white/10 rounded-full"><X /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950">
                            <KnowledgeIngester profileId={profileId!} memories={memories} onRefresh={() => loadMemories(profileId!)} />
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}