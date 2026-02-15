'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Radio, Send, Activity, CheckSquare, LogOut,
    UploadCloud, Radar, Loader2, ShieldOff
} from 'lucide-react';
import ShadowGlobe from '@/components/shadow-globe';

import GuardianFeed from '@/components/cortex/GuardianFeed';

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

            {/* BACKGROUND GLOBE - Optimisé pour ne pas gêner le tactile */}
            <div className="fixed inset-0 pointer-events-none opacity-10 z-0">
                <ShadowGlobe onLocationChange={() => { }} />
            </div>

            {/* WRAPPER PRINCIPAL */}
            <div className={`flex-1 flex flex-col p-4 md:p-8 transition-all duration-500 z-10 ${isChatOpen ? 'blur-md scale-[0.98] pointer-events-none' : 'blur-0 scale-100'}`}>

                {/* HEADER - Plus compact sur mobile */}
                <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 border-b border-white/10 pb-4">
                    <div className="text-center sm:text-left">
                        <h1 className="text-xl md:text-3xl font-black italic bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">MISSION CONTROL</h1>
                        <p className="text-[9px] text-slate-500 tracking-[0.2em] uppercase">Protocol v2.1 • {profileId.slice(0, 8)}</p>
                    </div>
                    <div className="flex gap-2 scale-90 sm:scale-100">
                        <button onClick={triggerManualScan} disabled={isScanning} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-2 uppercase tracking-widest">
                            {isScanning ? <Loader2 className="animate-spin" size={14} /> : <Radar size={14} />} Scan
                        </button>
                        <button onClick={() => router.push(`/dashboard/blocked?profileId=${profileId}`)} className="p-2 bg-red-950/20 border border-red-900/30 text-red-500 rounded-lg"><ShieldOff size={16} /></button>
                        <button onClick={() => {
                            import('@supabase/supabase-js').then(({ createClient }) => {
                                const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
                                sb.auth.signOut().then(() => router.push('/'));
                            });
                        }} className="p-2 bg-red-950/30 border border-red-900/50 rounded hover:bg-red-900"><LogOut size={16} /></button>
                    </div>
                </header>

                {/* GRILLE DYNAMIQUE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                    {/* 1. LE FEED DU GARDIEN (Priorité Mobile) */}
                    {/* On le met en premier dans l'ordre visuel sur mobile avec 'order-1' */}
                    <div className="lg:col-span-8 order-1 flex flex-col bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden min-h-[450px] sm:min-h-[500px] shadow-2xl relative">
                        <div className="p-3 border-b border-white/5 bg-zinc-900/30 flex items-center justify-between">
                            <span className="text-[9px] font-black tracking-widest text-cyan-500 uppercase">Guardian Matrix Feed</span>
                            <Activity size={14} className="text-cyan-500 animate-pulse" />
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {/* Si pas d'interventions, on met un placeholder visuel pour éviter le sentiment de "fenêtre vide" */}
                            {interventions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-2">
                                    <Radar size={40} />
                                    <p className="text-[10px] uppercase">En attente de données de scan...</p>
                                </div>
                            ) : (
                                <GuardianFeed interventions={interventions} profileId={profileId} onClear={() => setInterventions([])} onRefresh={triggerManualScan} />
                            )}
                        </div>

                        {/* L'INPUT D'ORDRE : Toujours visible en bas du module */}
                        <div className="p-3 bg-black/60 border-t border-white/5 backdrop-blur-md">
                            <div className="flex gap-2 bg-slate-950 border border-white/10 rounded-xl p-1 focus-within:border-cyan-500/50 transition-all">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-600"
                                    placeholder="Ordre au Gardien..."
                                />
                                <button className="bg-cyan-600 p-2 rounded-lg text-white active:scale-90 transition-transform"><Send size={16} /></button>
                            </div>
                        </div>
                    </div>

                    {/* 2. LES OUTILS : DROPZONE & PENSÉE (En dessous sur mobile) */}
                    <div className="lg:col-span-4 order-2 flex flex-col gap-6">

                        {/* DROPZONE COMPACTE */}
                        <div
                            onClick={() => document.getElementById('file-input')?.click()}
                            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer ${isDragging ? 'border-cyan-400 bg-cyan-900/20 scale-105' : 'border-slate-800 bg-slate-900/40'}`}
                        >
                            <input type="file" id="file-input" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                            <UploadCloud size={28} className="text-cyan-500 mb-2" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Toucher pour Transférer</span>
                        </div>

                        {/* ENCODAGE DE PENSÉE */}
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
                                    placeholder="Pensée..."
                                />
                                <button onClick={handleNeuroSave} className="text-cyan-500 p-2"><CheckSquare size={18} /></button>
                            </div>
                        </div>

                        {/* LIAISONS ACTIVES (En bas de pile) */}
                        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 flex-1">
                            <h3 className="text-[9px] font-black tracking-widest text-slate-500 uppercase mb-4 flex items-center gap-2">
                                <Radio size={12} /> Liaisons ({channels.length})
                            </h3>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {channels.map((channel: any) => {
                                    const isInitiator = channel.member_one_id === profileId;
                                    const partnerId = isInitiator ? channel.member_two_id : channel.member_one_id;
                                    return (
                                        <div key={channel.id} className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-mono text-slate-600 uppercase">ID:{partnerId.slice(0, 6)}</span>
                                                <span className="text-[10px] font-bold text-slate-300">Liaison Directe</span>
                                            </div>
                                            <button
                                                onClick={() => { setActiveChannelId(channel.id); setChatPartnerId(partnerId); setIsChatOpen(true); }}
                                                className="px-3 py-1.5 bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 rounded-lg text-[9px] font-black uppercase"
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

            {/* PORTALS (Restent en dehors du flou) */}
            {isChatOpen && chatPartnerId && (
                <SecureWhatsApp
                    profileId={profileId}
                    partnerId={chatPartnerId}
                    channelId={activeChannelId}
                    onClose={() => setIsChatOpen(false)}
                />
            )}
        </main>
    );
}