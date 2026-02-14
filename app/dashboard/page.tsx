'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Radio, MessageCircle, Send, X, Volume2, VolumeX, Activity, Mic, MicOff,
    UserPlus, Trash2, CheckSquare, BrainCircuit, AlertTriangle, LogOut,
    FileText, UploadCloud, Radar, Loader2, ShieldOff
} from 'lucide-react';
import ShadowGlobe from '@/components/shadow-globe';
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

            {/* BACKGROUND GLOBE (FIXED) */}
            <div className="fixed inset-0 pointer-events-none opacity-20">
                <ShadowGlobe onLocationChange={() => { }} />
            </div>

            {/* CONTENU WRAPPER - Gère le flou quand le chat est ouvert */}
            <div className={`flex-1 flex flex-col p-4 md:p-8 transition-all duration-500 ${isChatOpen ? 'blur-md scale-[0.98] pointer-events-none' : 'blur-0 scale-100'}`}>

                {/* HEADER RESPONSIVE */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black italic bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">MISSION CONTROL</h1>
                        <p className="text-[10px] text-slate-500 tracking-[0.3em] uppercase">Security Level: Maximum • {profileId.slice(0, 8)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => router.push(`/dashboard/blocked?profileId=${profileId}`)} className="p-2 bg-red-950/20 border border-red-900/30 text-red-500 rounded-lg text-[10px] font-bold uppercase"><ShieldOff size={16} /></button>
                        <button onClick={triggerManualScan} disabled={isScanning} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-2 uppercase tracking-widest">{isScanning ? <Loader2 className="animate-spin" size={16} /> : <Radar size={16} />} Scan</button>
                        <button onClick={() => {
                            import('@supabase/supabase-js').then(({ createClient }) => {
                                const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
                                sb.auth.signOut().then(() => router.push('/'));
                            });
                        }} className="p-2 bg-red-950/30 border border-red-900/50 rounded hover:bg-red-900 transition-all"><LogOut size={16} /></button>
                    </div>
                </header>

                {/* ZONE D'ACTION : DROPZONE & ENCODAGE */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div
                        onClick={() => document.getElementById('file-input')?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer ${isDragging ? 'border-cyan-400 bg-cyan-900/20' : 'border-slate-800 bg-slate-900/40 hover:border-slate-600'}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]); }}
                    >
                        <input type="file" id="file-input" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                        <UploadCloud size={32} className="text-cyan-500 mb-2" />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Transférer Données</span>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col justify-center gap-3">
                        <div className="flex items-center gap-2 bg-black/40 rounded-xl p-2 border border-white/5">
                            <button onClick={() => setIsPrivateMemory(!isPrivateMemory)} className={`p-2 rounded-lg text-sm ${isPrivateMemory ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>{isPrivateMemory ? '🔒' : '🌐'}</button>
                            <input type="text" value={neuroInput} onChange={(e) => setNeuroInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleNeuroSave()} placeholder="Encoder une pensée..." className="flex-1 bg-transparent border-none text-sm outline-none" />
                            <button onClick={handleNeuroSave} disabled={!neuroInput} className="text-cyan-500 p-2"><CheckSquare size={20} /></button>
                        </div>
                    </div>
                </section>

                {/* GRILLE DES MODULES : GARDIEN & LIAISONS */}
                <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">

                    {/* FENÊTRE GARDIEN (60% LARGEUR PC) */}
                    <div className="xl:col-span-8 bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden flex flex-col min-h-[500px] shadow-2xl relative">
                        <div className="p-4 border-b border-white/5 bg-zinc-900/30 flex items-center justify-between">
                            <span className="text-[10px] font-black tracking-[0.3em] text-cyan-500 uppercase">Guardian Matrix Feed</span>
                            <Activity size={14} className="text-cyan-500 animate-pulse" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <GuardianFeed interventions={interventions} profileId={profileId} onClear={() => setInterventions([])} onRefresh={triggerManualScan} />
                        </div>
                        <div className="p-4 bg-black/40 border-t border-white/5">
                            <div className="flex gap-2 bg-slate-950 border border-white/10 rounded-xl p-1 focus-within:border-cyan-500/50 transition-all">
                                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="flex-1 bg-transparent px-4 py-2 text-sm outline-none" placeholder="Donner un ordre au Gardien..." />
                                <button className="bg-cyan-600 p-2 rounded-lg text-white"><Send size={18} /></button>
                            </div>
                        </div>
                    </div>

                    {/* FENÊTRE LIAISONS (40% LARGEUR PC) */}
                    <div className="xl:col-span-4 flex flex-col gap-4">
                        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col h-full min-h-[500px]">
                            <h3 className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-6 flex items-center gap-2">
                                <Radio size={14} /> Liaisons Actives ({channels.length})
                            </h3>
                            <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2">
                                {channels.map((channel: any) => {
                                    const isInitiator = channel.member_one_id === profileId;
                                    const partnerId = isInitiator ? channel.member_two_id : channel.member_one_id;
                                    return (
                                        <div key={channel.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-cyan-500/30 transition-all">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[9px] font-mono text-slate-500 uppercase">ID: {partnerId?.slice(0, 8)}</span>
                                                <span className={`text-[8px] px-2 py-0.5 rounded-full ${isInitiator ? 'bg-indigo-500/20 text-indigo-400' : 'bg-green-500/20 text-green-400'}`}>{isInitiator ? 'Sortant' : 'Entrant'}</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setActiveChannelId(channel.id);
                                                    setChatPartnerId(partnerId);
                                                    setIsChatOpen(true);
                                                }}
                                                className="w-full py-2.5 bg-zinc-800 hover:bg-cyan-600 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                                            >
                                                <MessageCircle size={14} /> Chat
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* --- PORTALS (Toujours à l'extérieur du wrapper flou) --- */}
            {isChatOpen && chatPartnerId && (
                <SecureWhatsApp
                    profileId={profileId}
                    partnerId={chatPartnerId}
                    channelId={activeChannelId}
                    onClose={() => setIsChatOpen(false)}
                />
            )}

            {showCortexPanel && (
                <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col">
                        <div className="p-6 flex justify-between items-center border-b border-white/10">
                            <h2 className="text-lg font-bold flex items-center gap-3"><BrainCircuit className="text-cyan-400" /> Cortex Data</h2>
                            <button onClick={() => setShowCortexPanel(false)}><X /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <KnowledgeIngester profileId={profileId!} memories={memories} onRefresh={() => loadMemories(profileId!)} />
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}