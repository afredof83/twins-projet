'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Radio, MessageCircle, Send, X, Volume2, VolumeX, Activity, Mic, MicOff, UserPlus, Trash2, CheckSquare, BrainCircuit, AlertTriangle, LogOut, FileText, UploadCloud } from 'lucide-react';
import ShadowGlobe from '@/components/shadow-globe';
import AudioInput from '@/components/AudioInput';
import VoiceOutput from '@/components/VoiceOutput';
import RadarWidget from '@/components/RadarWidget';
import CommlinkButton from '@/components/CommlinkButton';

const SFX = {
    LAUNCH: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3',
    SUCCESS: 'https://cdn.pixabay.com/audio/2022/03/15/audio_73199d146c.mp3',
    PING: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c3943905c1.mp3',
    CONNECT: 'https://cdn.pixabay.com/audio/2022/03/24/audio_03e06c4b26.mp3',
    DELETE: 'https://cdn.pixabay.com/audio/2022/03/10/audio_5b38383796.mp3'
};

const SafeMissionControl = ({ count }: { count: number }) => {
    const syncRate = Math.min(100, Math.floor(count * 5));
    return (
        <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={14} className="text-green-500 animate-pulse" /> Systèmes Vitaux
            </h3>
            <div className="space-y-6">
                <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-cyan-400 font-mono">Synchro Neurale</span><span className="text-white font-bold">{syncRate}%</span></div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-600 to-purple-600 transition-all duration-1000 shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${syncRate}%` }}></div></div>
                </div>
                <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-purple-400 font-mono">Fragments RAG</span><span className="text-white font-bold">{count}</span></div>
                    <div className="grid grid-cols-10 gap-1">{[...Array(10)].map((_, i) => (<div key={i} className={`h-1 rounded-full transition-all delay-[${i * 50}ms] ${i < (Math.min(count, 50) / 5) ? 'bg-purple-500 shadow-[0_0_5px_#a855f7]' : 'bg-slate-800'}`}></div>))}</div>
                </div>
            </div>
        </div>
    );
};

export default function MissionControl() {
    const router = useRouter();
    const [profileId, setProfileId] = useState<string | null>(null);

    // Etats
    const [isInitialized, setIsInitialized] = useState(false);
    const [memories, setMemories] = useState<any[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);
    const [isSentinelActive, setIsSentinelActive] = useState(false);

    // Drag & Drop
    const [isDragging, setIsDragging] = useState(false);

    // Chat & Mission
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'twin', content: string }>>([]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [lastSpokenText, setLastSpokenText] = useState<string | null>(null);

    // Audio & SFX
    const [audioEnabled, setAudioEnabled] = useState(true);

    // Cortex
    const [neuroInput, setNeuroInput] = useState('');
    const [isPrivateMemory, setIsPrivateMemory] = useState(false);
    const [isSavingMemory, setIsSavingMemory] = useState(false);
    const [showCortexPanel, setShowCortexPanel] = useState(false);
    const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);

    const chatRef = useRef<HTMLDivElement>(null);

    // --- LOGS & SFX ---
    const addLog = (message: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev].slice(0, 50));
    const playSFX = (url: string) => { if (audioEnabled) { try { new Audio(url).play().catch(() => { }); } catch (e) { } } };

    // --- INIT ---
    useEffect(() => {
        const init = async () => {
            const { createClient } = await import('@supabase/supabase-js');
            const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
            const { data: { user } } = await sb.auth.getUser();
            if (!user) { router.push('/'); return; }

            setProfileId(user.id);
            setIsInitialized(true);
            addLog('[BOOT] Système Twin v2.1 en ligne.');
            playSFX(SFX.CONNECT);
            loadMemories(user.id);
            fetchContacts(user.id);
        };
        init();
    }, []);

    const loadMemories = async (pid: string) => { try { const res = await fetch(`/api/memories?profileId=${pid}`); const data = await res.json(); if (data.memories) setMemories(data.memories); } catch (e) { } };
    const fetchContacts = async (pid: string) => { try { const res = await fetch(`/api/contacts?profileId=${pid}`); const data = await res.json(); if (data.contacts) setContacts(data.contacts); } catch (e) { } };

    const handleLogout = async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        await sb.auth.signOut();
        window.location.href = '/';
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !profileId) return;
        const msg = chatInput; setChatInput(''); setChatMessages(prev => [...prev, { role: 'user', content: msg }]); setIsThinking(true); playSFX(SFX.LAUNCH);
        try {
            const res = await fetch('/api/cortex/chat', { method: 'POST', body: JSON.stringify({ message: msg, profileId }), headers: { 'Content-Type': 'application/json' } });
            const data = await res.json();
            setChatMessages(prev => [...prev, { role: 'twin', content: data.reply || "Silence radio." }]);
            setLastSpokenText(data.reply || "Silence radio.");
            playSFX(SFX.PING);
        } catch (e) { setChatMessages(prev => [...prev, { role: 'twin', content: "Erreur connexion." }]); } finally { setIsThinking(false); }
    };

    const handleNeuroSave = async () => {
        if (!neuroInput.trim() || !profileId) return; setIsSavingMemory(true);
        try {
            await fetch('/api/memories/add', { method: 'POST', body: JSON.stringify({ content: neuroInput, type: isPrivateMemory ? 'private' : 'thought', profileId }), headers: { 'Content-Type': 'application/json' } });
            setNeuroInput(''); addLog('[MEM] Souvenir encodé.'); playSFX(SFX.SUCCESS); loadMemories(profileId);
        } finally { setIsSavingMemory(false); }
    };

    // --- DROP HANDLER ---
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (!profileId || e.dataTransfer.files.length === 0) return;

        const file = e.dataTransfer.files[0];
        addLog(`[SENSOR] Analyse de ${file.name}...`);
        playSFX(SFX.LAUNCH);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('profileId', profileId);

        try {
            const res = await fetch('/api/sensors/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                addLog(`[SUCCÈS] ${data.fragments} fragments mémorisés.`);
                playSFX(SFX.SUCCESS);
                loadMemories(profileId);
            } else {
                addLog(`[ERREUR] ${data.error}`);
                playSFX(SFX.DELETE);
            }
        } catch (err) { addLog(`[CRITIQUE] Échec upload.`); }
    };

    // --- CYCLE SENTINELLE ---
    // --- CYCLE SENTINELLE ---
    useEffect(() => {
        if (!isSentinelActive || !profileId) return;

        // Feedback immédiat au démarrage
        addLog("[SENTINELLE] Activation des protocoles d'analyse...");

        const interval = setInterval(async () => {
            try {
                const res = await fetch('/api/cortex/reflect', { method: 'POST', body: JSON.stringify({ profileId }) });
                const data = await res.json();

                if (data.thought?.thought) {
                    addLog(`[SENTINELLE] 💡 ${data.thought.thought}`);
                    playSFX(SFX.PING);
                    // On recharge les mémoires pour voir la nouvelle pensée apparaître dans la liste
                    loadMemories(profileId);
                }
            } catch (e) {
                console.error("Sentinelle hors ligne");
            }
        }, 60000); // 1 minute interval
        return () => clearInterval(interval);
    }, [isSentinelActive, profileId]);

    if (!profileId || !isInitialized) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-mono"><div className="text-4xl mb-4 animate-spin">💠</div><div className="text-cyan-500 animate-pulse">BOOT SEQUENCE...</div></div>;

    return (
        <main
            className={`relative min-h-screen w-full bg-slate-950 p-4 md:p-8 flex flex-col gap-6 font-mono overflow-hidden transition-all duration-300 ${isDragging ? 'bg-cyan-900/10' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={handleDrop}
        >

            {/* HEADER */}
            <div className="max-w-7xl mx-auto pt-2 mb-2 flex justify-between items-center border-b border-slate-800 pb-4 w-full z-10">
                <div><h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent tracking-tighter">MISSION CONTROL</h1><p className="text-xs text-slate-500 tracking-[0.3em] uppercase">Twin Protocol v2.1 • {profileId.slice(0, 8)}</p></div>
                <div className="flex gap-4 items-center">
                    <CommlinkButton profileId={profileId} />
                    <button onClick={() => setIsSentinelActive(!isSentinelActive)} className={`px-4 py-2 rounded-lg text-xs flex items-center gap-2 border ${isSentinelActive ? 'bg-red-900/20 border-red-500 text-red-400 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'}`}><BrainCircuit size={14} /> {isSentinelActive ? 'SENTINELLE: ON' : 'MANUEL'}</button>
                    <button onClick={() => setAudioEnabled(!audioEnabled)} className={`p-2 rounded-full border transition-all ${audioEnabled ? 'bg-green-900/30 text-green-400 border-green-500' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>{audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
                    <div className="w-px h-8 bg-slate-800 mx-2"></div>
                    <button onClick={handleLogout} className="p-2 rounded bg-red-950/30 text-red-500 border border-red-900/50 hover:bg-red-900 hover:text-white transition-colors" title="DÉCONNEXION"><LogOut size={18} /></button>
                </div>
            </div>

            {/* ZONE DE DROP PERMANENTE ET FLASHY */}
            <div
                className={`w-full max-w-2xl mx-auto border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer mb-6 z-40 
        ${isDragging ? 'border-yellow-400 bg-cyan-900/50 scale-105 shadow-[0_0_50px_rgba(6,182,212,0.5)] animate-pulse' : 'border-slate-800 bg-slate-900/40 hover:border-cyan-500/50'}`}
            >
                <div className={`flex items-center gap-3 text-sm font-bold uppercase tracking-widest ${isDragging ? 'text-yellow-400' : 'text-slate-500'}`}>
                    <UploadCloud size={32} className={isDragging ? 'animate-bounce' : ''} />
                    {isDragging ? '>>> RELÂCHER FICHIER <<<' : 'DÉPOSER DOCUMENTS ICI'}
                </div>
            </div>

            {/* BARRE ENCODAGE (CENTRALE) */}
            <div className="w-full max-w-xl mx-auto mb-2 relative z-30">
                <div className={`relative bg-slate-900/80 backdrop-blur-md border rounded-2xl shadow-2xl flex items-center p-2 transition-all ${isSavingMemory ? 'border-purple-500' : 'border-slate-700 hover:border-cyan-500'}`}>
                    <button onClick={() => setIsPrivateMemory(!isPrivateMemory)} className={`p-2 rounded-xl text-xs mr-2 border ${isPrivateMemory ? 'bg-red-900/30 text-red-400 border-red-500' : 'bg-green-900/30 text-green-400 border-green-500'}`}>{isPrivateMemory ? '🔒' : '🌐'}</button>
                    <input type="text" value={neuroInput} onChange={(e) => setNeuroInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleNeuroSave()} placeholder="Encoder une pensée manuelle..." className="flex-1 bg-transparent border-none text-white focus:ring-0 text-sm placeholder-slate-600" disabled={isSavingMemory} />
                    <button onClick={handleNeuroSave} disabled={!neuroInput} className="p-2 ml-2 text-cyan-500 hover:text-cyan-300"><CheckSquare /></button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 h-[600px]">
                {/* GAUCHE */}
                <div className="lg:col-span-2 flex flex-col gap-6 h-full">
                    <SafeMissionControl count={memories.length} />
                    <div className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl flex flex-col overflow-hidden relative shadow-2xl">
                        <div className="p-3 border-b border-slate-800 bg-slate-900/80 text-xs font-bold text-slate-400 flex justify-between items-center"><span className="flex items-center gap-2"><Activity size={12} /> INTERFACE NEURONALE</span>{isThinking && <span className="text-cyan-400 animate-pulse">TRAITEMENT...</span>}</div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                            {chatMessages.length === 0 && <div className="text-center text-slate-600 mt-20 opacity-50">LIEN NEURONAL ACTIF</div>}
                            {chatMessages.map((msg, idx) => (<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-lg ${msg.role === 'user' ? 'bg-cyan-700 text-white rounded-br-none' : 'bg-slate-800 text-cyan-100 border border-slate-700 rounded-bl-none'}`}>{msg.content}</div></div>))}
                            <div ref={chatRef} />
                        </div>
                        <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2 items-center">
                            <AudioInput
                                isProcessing={isThinking}
                                onTranscript={(text) => {
                                    setChatInput(text);
                                }}
                            />
                            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-transparent border border-slate-700 rounded-lg px-3 text-sm focus:border-cyan-500 outline-none h-10 text-cyan-100" placeholder="Commande..." /><button onClick={handleSendMessage} className="bg-cyan-700 text-white px-4 rounded-lg h-10 hover:bg-cyan-600">➤</button></div>
                    </div>
                </div>

                {/* CENTRE */}
                <div className="lg:col-span-1 flex flex-col gap-6 h-full">
                    <div className="h-1/2 bg-black/40 rounded-xl border border-slate-800 overflow-hidden relative group"><div className="absolute top-2 left-2 z-10 text-[10px] font-bold text-cyan-500/50 bg-black/80 px-2 rounded border border-cyan-900">RÉSEAU GLOBAL</div><ShadowGlobe onLocationChange={() => addLog(`[NOEUD] Activité détectée`)} /></div>

                    {/* NOUVEAU RADAR ICI */}
                    <div className="h-1/2 flex flex-col">
                        <RadarWidget />
                    </div>
                </div>

                {/* DROITE */}
                <div className="lg:col-span-1 flex flex-col gap-6 h-full">
                    <div className="h-1/2 bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col"><div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2"><div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase"><Radio size={14} /> CANAUX ({contacts.length})</div></div><div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">{contacts.map((contact) => (<button key={contact.id} className="w-full text-left p-3 rounded-lg border border-slate-800 bg-slate-800/30 hover:bg-slate-800 hover:border-cyan-500/50 transition-all group"><div className="font-bold text-xs text-slate-300 group-hover:text-cyan-400">{contact.name || contact.id.slice(0, 8)}</div><div className="text-[10px] text-slate-500 truncate mt-1">{contact.lastMessage}</div></button>))}</div></div>
                    <div className="flex-1 bg-black border border-slate-800 rounded-xl p-3 font-mono text-[10px] overflow-hidden relative"><div className="text-slate-600 mb-2 font-bold border-b border-slate-900 pb-1">TERMINAL_LOGS</div><div className="space-y-1 h-full overflow-y-auto pb-6">{logs.map((log, i) => <div key={i} className="text-cyan-500/70 truncate border-l-2 border-cyan-900 pl-2 opacity-80">{log}</div>)}</div></div>
                </div>
            </div>

            <div className="fixed bottom-6 right-6 z-50"><button onClick={() => setShowCortexPanel(true)} className="p-4 bg-slate-900 border-2 border-purple-500 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.4)] text-white hover:scale-110 transition-transform"><BrainCircuit size={28} /></button></div>

            {showCortexPanel && (
                <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl p-8 animate-in fade-in duration-300"><div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-bold text-purple-400 tracking-tight">CORTEX DATABASE</h2><button onClick={() => setShowCortexPanel(false)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700"><X size={24} /></button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{memories.map(m => (<div key={m.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-purple-500 transition-colors cursor-pointer group" onClick={() => { if (selectedMemoryIds.includes(m.id)) setSelectedMemoryIds(p => p.filter(id => id !== m.id)); else setSelectedMemoryIds(p => [...p, m.id]); }}><div className="flex justify-between text-[10px] text-slate-500 mb-2"><span className="uppercase bg-slate-950 px-2 rounded border border-slate-800">{m.type}</span><span>{new Date(m.createdAt).toLocaleDateString()}</span></div><p className="text-sm text-slate-300 group-hover:text-white line-clamp-4">{m.content}</p>{selectedMemoryIds.includes(m.id) && <div className="mt-2 text-xs text-purple-400 font-bold flex items-center gap-1"><CheckSquare size={12} /> SÉLECTIONNÉ</div>}</div>))}</div>{selectedMemoryIds.length > 0 && (<div className="fixed bottom-8 right-8"><button onClick={async () => { if (!confirm("Supprimer ?")) return; await fetch('/api/memories/delete', { method: 'POST', body: JSON.stringify({ ids: selectedMemoryIds }), headers: { 'Content-Type': 'application/json' } }); setSelectedMemoryIds([]); loadMemories(profileId!); setShowCortexPanel(false); }} className="bg-red-600 text-white px-6 py-4 rounded-xl font-bold flex items-center gap-2 shadow-2xl hover:bg-red-500 transition-transform hover:scale-105"><Trash2 size={20} /> PURGER LA SÉLECTION</button></div>)}</div>
            )}

            <VoiceOutput textToSpeak={lastSpokenText} enabled={audioEnabled} />
        </main>
    );
}