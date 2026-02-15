'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Radio, Send, Activity, CheckSquare, LogOut,
    UploadCloud, Radar, Loader2, ShieldOff, BrainCircuit, X
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ShadowGlobe = dynamic(() => import('@/components/shadow-globe'), {
    ssr: false,
    loading: () => <div className="fixed inset-0 bg-slate-950" />
});
import CommlinkButton from '@/components/CommlinkButton';
import GuardianFeed from '@/components/cortex/GuardianFeed';
import KnowledgeIngester from '@/components/cortex/KnowledgeIngester';
import SecureWhatsApp from '@/components/SecureWhatsApp';

const SFX = {
    PING: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c3943905c1.mp3',
    CONNECT: 'https://cdn.pixabay.com/audio/2022/03/24/audio_03e06c4b26.mp3',
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
        <main className="relative min-h-screen w-full bg-slate-950 text-white font-mono flex flex-col overflow-x-hidden">

            {/* --- 1. LE GLOBE 3D (BACKDROP) --- */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="w-full h-full opacity-40 scale-110 sm:scale-100 transition-opacity duration-1000">
                    <ShadowGlobe onLocationChange={() => addLog(`[NOEUD] Activité détectée`)} />
                </div>
            </div>

            {/* CONTENU WRAPPER */}
            <div className={`flex-1 flex flex-col p-4 md:p-8 transition-all duration-500 z-10 ${isChatOpen ? 'blur-md scale-[0.98] pointer-events-none' : 'blur-0 scale-100'}`}>

                {/* --- 2. HEADER OPTIMISÉ (PC \u0026 MOBILE) --- */}
                <header className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-8 border-b border-white/10 pb-6 bg-slate-950/50 backdrop-blur-sm rounded-b-2xl p-4">
                    <div className="text-center lg:text-left">
                        <h1 className="text-2xl md:text-4xl font-black italic bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">MISSION CONTROL</h1>
                        <p className="text-[10px] text-slate-500 tracking-[0.3em] uppercase">Security Level: Maximum • {profileId?.slice(0, 8)}</p>
                    </div>

                    {/* BARRE DE BOUTONS RESPONSIVE */}
                    <div className="flex flex-wrap justify-center items-center gap-3">

                        {/* BOUTON CORTEX (RESTAURÉ ET OPTIMISÉ MOBILE) */}
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

                {/* --- 3. GRILLE DE MODULES --- */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                    {/* FEED DU GARDIEN */}
                    <div className="lg:col-span-8 order-1 flex flex-col bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden min-h-[450px] shadow-2xl relative">
                        <div className="p-3 border-b border-white/5 bg-zinc-900/30 flex items-center justify-between">
                            <span className="text-[9px] font-black tracking-widest text-cyan-500 uppercase flex items-center gap-2">
                                <Activity size={14} className="animate-pulse" /> Guardian Matrix Feed
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            <GuardianFeed interventions={interventions} profileId={profileId} onClear={() => setInterventions([])} onRefresh={triggerManualScan} />
                        </div>

                        {/* INPUT ORDRE */}
                        <div className="p-3 bg-black/60 border-t border-white/5 backdrop-blur-md">
                            <div className="flex gap-2 bg-slate-950 border border-white/10 rounded-xl p-1 focus-within:border-cyan-500/50 transition-all">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-700"
                                    placeholder="Ordre au Gardien..."
                                />
                                <button className="bg-cyan-600 p-2 rounded-lg text-white active:scale-90 transition-transform"><Send size={16} /></button>
                            </div>
                        </div>
                    </div>

                    {/* COLONNE DROITE : LIAISONS \u0026 ACTIONS */}
                    <div className="lg:col-span-4 order-2 flex flex-col gap-6">

                        {/* DROPZONE COMPACTE */}
                        <div
                            onClick={() => document.getElementById('file-input')?.click()}
                            className="group border-2 border-dashed border-slate-800 bg-slate-900/40 rounded-2xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer hover:border-cyan-500/50"
                        >
                            <input type="file" id="file-input" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                            <UploadCloud size={32} className="text-cyan-500 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Transférer Données</span>
                        </div>

                        {/* ENCODAGE PENSÉE */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
                            <div className="flex items-center gap-2 bg-black/40 rounded-xl p-1.5 border border-white/5">
                                <button onClick={() => setIsPrivateMemory(!isPrivateMemory)} className={`p-2 rounded-lg text-xs ${isPrivateMemory ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                                    {isPrivateMemory ? '🔒' : '🌐'}
                                </button>
                                <input
                                    type="text"
                                    value={neuroInput}
                                    onChange={(e) => setNeuroInput(e.target.value)}
                                    className="flex-1 bg-transparent border-none text-xs outline-none"
                                    placeholder="Encoder pensée..."
                                />
                                <button onClick={handleNeuroSave} className="text-cyan-500 p-2"><CheckSquare size={18} /></button>
                            </div>
                        </div>

                        {/* LIAISONS ACTIVES */}
                        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 flex-1 shadow-inner">
                            <h3 className="text-[9px] font-black tracking-widest text-slate-500 uppercase mb-4 flex items-center gap-2">
                                <Radio size={12} className="text-cyan-500" /> Liaisons ({channels.length})
                            </h3>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {channels.map((channel: any) => {
                                    const isInitiator = channel.member_one_id === profileId;
                                    const partnerId = isInitiator ? channel.member_two_id : channel.member_one_id;
                                    return (
                                        <div key={channel.id} className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center hover:border-cyan-500/20 transition-all">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-mono text-slate-600">ID:{partnerId?.slice(0, 6)}</span>
                                                <span className="text-[10px] font-bold text-slate-300">Canal Direct</span>
                                            </div>
                                            <button
                                                onClick={() => { setActiveChannelId(channel.id); setChatPartnerId(partnerId); setIsChatOpen(true); }}
                                                className="px-3 py-1.5 bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 rounded-lg text-[9px] font-black uppercase hover:bg-cyan-500 hover:text-white transition-all"
                                            >
                                                Chat
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- 4. PORTALS (CORTEX \u0026 CHAT) --- */}
            {isChatOpen && chatPartnerId && (
                <SecureWhatsApp
                    profileId={profileId}
                    partnerId={chatPartnerId}
                    channelId={activeChannelId}
                    onClose={() => setIsChatOpen(false)}
                />
            )}

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