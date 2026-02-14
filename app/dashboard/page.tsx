'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Radio, MessageCircle, Send, X, Volume2, VolumeX, Activity, Mic, MicOff,
    UserPlus, Trash2, CheckSquare, BrainCircuit, AlertTriangle, LogOut,
    FileText, UploadCloud, Radar, Loader2, ShieldOff
} from 'lucide-react';
import ShadowGlobe from '@/components/shadow-globe';
import AudioInput from '@/components/AudioInput';
import VoiceOutput from '@/components/VoiceOutput';
import CommlinkButton from '@/components/CommlinkButton';
import GuardianFeed from '@/components/cortex/GuardianFeed';
import KnowledgeIngester from '@/components/cortex/KnowledgeIngester';
import SecureWhatsApp from '@/components/SecureWhatsApp';

const SFX = {
    LAUNCH: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3',
    SUCCESS: 'https://cdn.pixabay.com/audio/2022/03/15/audio_73199d146c.mp3',
    PING: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c3943905c1.mp3',
    CONNECT: 'https://cdn.pixabay.com/audio/2022/03/24/audio_03e06c4b26.mp3',
    DELETE: 'https://cdn.pixabay.com/audio/2022/03/10/audio_5b38383796.mp3'
};

export default function MissionControl() {
    const router = useRouter();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [targetProfileId, setTargetProfileId] = useState<string | null>(null);

    // États UI
    const [isInitialized, setIsInitialized] = useState(false);
    const [memories, setMemories] = useState<any[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);
    const [isScanning, setIsScanning] = useState(false); // <--- NOUVEAU

    const [activeRequest, setActiveRequest] = useState<any>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);
    const [channels, setChannels] = useState<any[]>([]);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(true);

    const [neuroInput, setNeuroInput] = useState('');
    const [isPrivateMemory, setIsPrivateMemory] = useState(false);
    const [isSavingMemory, setIsSavingMemory] = useState(false);
    const [isOracleMode, setIsOracleMode] = useState(false);
    const [showCortexPanel, setShowCortexPanel] = useState(false);
    const [interventions, setInterventions] = useState<any[]>([]);

    const addLog = (message: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev].slice(0, 50));
    const playSFX = (url: string) => { if (audioEnabled) { try { new Audio(url).play().catch(() => { }); } catch (e) { } } };

    const handlePingAccept = async (request: any) => {
        // Logique d'acceptation : créer le canal si pas existant, marquer request acceptée
        // Simple implémentation pour l'instant : redirection vers chat ou fermeture alerte
        console.log("Accepting request:", request);

        try {
            // Exemple: appeler une API pour valider le ping (non implémenté détaillée ici, on simule)
            // Dans un vrai flow, on mettrait à jour le statut dans la DB messages/channels

            // Pour l'instant, on ouvre le chat avec ce partenaire
            setChatPartnerId(request.requester_id);
            setIsChatOpen(true);
            setActiveRequest(null);
        } catch (e) {
            console.error(e);
        }
    };

    // --- FONCTION DE SCAN MANUEL ---
    const triggerManualScan = async () => {
        if (!profileId) return;
        setIsScanning(true);
        addLog("[GARDIEN] Lancement du scan de base de données...");
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
                addLog(`[MATCH] Alerte détectée : ${data.intervention.title}`);
            } else {
                addLog("[INFO] Scan terminé. Aucune menace ou opportunité détectée.");
            }
        } catch (e) {
            console.error(e);
            addLog("[ERREUR] Échec du scan.");
        } finally {
            setIsScanning(false);
        }
    };

    // --- INITIALISATION ---
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
            fetchChannels(user.id);
        };
        init();
    }, []);

    // --- LISTENER PING TEMPS RÉEL ---
    useEffect(() => {
        if (!profileId) return;

        const setupRealtime = async () => {
            const { createClient } = await import('@supabase/supabase-js');
            const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

            const channel = sb
                .channel('ping-channel')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'AccessRequest',
                        filter: `provider_id=eq.${profileId}`
                    },
                    (payload) => {
                        console.log('🔔 SIGNAL REÇU :', payload.new);
                        setActiveRequest(payload.new);
                        playSFX(SFX.PING);
                    }
                )
                .subscribe();

            return () => { sb.removeChannel(channel); };
        };
        setupRealtime();
    }, [profileId]);

    const loadMemories = async (pid: string) => {
        const res = await fetch(`/api/memories?profileId=${pid}&t=${Date.now()}`);
        const data = await res.json();
        if (data.memories) setMemories(data.memories);
    };

    const fetchChannels = async (pid: string) => {
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data } = await sb.from('Channel').select('*').or(`member_one_id.eq.${pid},member_two_id.eq.${pid}`);
        if (data) {
            console.log("CHANNELS FETCHED (DEBUG):", data); // <--- Verification log
            setChannels(data);
        }
    };

    const handleLogout = async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        await sb.auth.signOut();
        window.location.href = '/';
    };

    const handleNeuroSave = async () => {
        if (!neuroInput.trim() || !profileId) return;
        setIsSavingMemory(true);
        const res = await fetch('/api/memories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: neuroInput, profileId, type: isPrivateMemory ? 'private' : 'thought' }),
        });
        if (res.ok) {
            addLog('[MEM] Pensée enregistrée.');
            setNeuroInput('');
            loadMemories(profileId);
        }
        setIsSavingMemory(false);
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !profileId) return;
        setIsThinking(true);
        addLog(`[USER] ${chatInput}`);
        // Logique simplifiée pour l'exemple
        setChatInput('');
        setIsThinking(false);
    };

    const handleFileUpload = async (file: File) => {
        if (!profileId) return;
        addLog(`[SENSOR] Analyse de ${file.name}...`);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('profileId', profileId);
        const res = await fetch('/api/sensors/upload', { method: 'POST', body: formData });
        if (res.ok) {
            addLog(`[SUCCÈS] Données mémorisées.`);
            loadMemories(profileId);
        }
    };

    if (!profileId || !isInitialized) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-mono"><div className="text-4xl mb-4 animate-spin">🌀</div><div className="text-cyan-500 animate-pulse">BOOT SEQUENCE...</div></div>;

    return (
        <main className={`relative min-h-screen w-full bg-slate-950 p-4 md:p-8 flex flex-col gap-6 font-mono overflow-hidden transition-all duration-300 ${isDragging ? 'bg-cyan-900/10' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]); }}>

            {/* HEADER */}
            <div className="max-w-7xl mx-auto pt-2 mb-2 flex justify-between items-center border-b border-slate-800 pb-4 w-full z-10">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent tracking-tighter italic">MISSION CONTROL</h1>
                    <p className="text-[10px] text-slate-500 tracking-[0.3em] uppercase">Twin Protocol v2.1 • {profileId.slice(0, 8)}</p>
                </div>
                <div className="flex gap-4 items-center">


                    {/* NOUVEAU : BOUTON GÉRER LES BLOQUÉS */}
                    <button
                        onClick={() => router.push(`/dashboard/blocked?profileId=${profileId}`)}
                        className="px-3 py-2 bg-red-950/20 border border-red-900/30 text-red-500 rounded-lg text-[10px] font-black hover:bg-red-900/40 transition-all flex items-center gap-2 group"
                        title="Gérer les clones bannis"
                    >
                        <ShieldOff size={16} className="group-hover:scale-110 transition-transform" />
                        BAN LIST
                    </button>

                    {/* BOUTON CORTEX DATA (RESTAURÉ) */}
                    <button
                        onClick={() => setShowCortexPanel(true)}
                        className="px-4 py-2 bg-cyan-900/30 border border-cyan-500/50 text-cyan-400 rounded-lg text-xs font-bold hover:bg-cyan-500 hover:text-white transition-all flex items-center gap-2"
                    >
                        <BrainCircuit size={16} /> CORTEX DATA
                    </button>

                    {/* BOUTON SCAN MANUEL (RADAR) */}
                    <button
                        onClick={triggerManualScan}
                        disabled={isScanning}
                        className={`p-2 rounded-lg border transition-all flex items-center gap-2 ${isScanning ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400'}`}
                        title="Scanner la base de données"
                    >
                        {isScanning ? <Loader2 className="animate-spin" size={20} /> : <Radar size={20} />}
                        <span className="text-[10px] font-bold tracking-widest uppercase">Scanner</span>
                    </button>

                    <CommlinkButton profileId={profileId} />
                    <button onClick={() => setAudioEnabled(!audioEnabled)} className={`p-2 rounded-full border transition-all ${audioEnabled ? 'bg-green-900/30 text-green-400 border-green-500' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>{audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
                    <button onClick={() => setIsOracleMode(!isOracleMode)} className={`px-4 py-2 rounded-lg text-xs flex items-center gap-2 border transition-all ${isOracleMode ? 'bg-purple-900/40 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                        {isOracleMode ? '🔮 MODE ORACLE' : '🤖 MODE STANDARD'}
                    </button>
                    <button onClick={handleLogout} className="p-2 rounded bg-red-950/30 text-red-500 border border-red-900/50 hover:bg-red-900 hover:text-white transition-colors"><LogOut size={18} /></button>
                </div>
            </div>

            {/* DROPZONE */}
            {!isChatOpen && (
                <div className={`w-full max-w-2xl mx-auto border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer mb-6 z-40 ${isDragging ? 'border-yellow-400 bg-cyan-900/50 scale-105 animate-pulse' : 'border-slate-800 bg-slate-900/40'}`}
                    onClick={() => document.getElementById('hidden-file-input')?.click()}>
                    <input type="file" id="hidden-file-input" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                    <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-slate-500">
                        <UploadCloud size={32} /> {isDragging ? 'RELACHER' : 'DÉPOSER / CLIQUER'}
                    </div>
                </div>
            )}

            {/* BARRE ENCODAGE */}
            {!isChatOpen && (
                <div className="w-full max-w-xl mx-auto mb-2 relative z-30">
                    <div className="relative bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl flex items-center p-2">
                        <button onClick={() => setIsPrivateMemory(!isPrivateMemory)} className={`p-2 rounded-xl text-xs mr-2 border ${isPrivateMemory ? 'bg-red-900/30 text-red-400 border-red-500' : 'bg-green-900/30 text-green-400 border-green-500'}`}>{isPrivateMemory ? '🔒' : '🌐'}</button>
                        <input type="text" value={neuroInput} onChange={(e) => setNeuroInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleNeuroSave()} placeholder="Encoder une pensée..." className="flex-1 bg-transparent border-none text-white text-sm" />
                        <button onClick={handleNeuroSave} disabled={!neuroInput} className="p-2 ml-2 text-cyan-500"><CheckSquare /></button>
                    </div>
                </div>
            )}

            {/* GRILLE PRINCIPALE */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-[500px]">
                {/* GAUCHE - GARDIEN FEED */}
                <div className="lg:col-span-2 flex flex-col gap-6 h-full">
                    <div className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl flex flex-col overflow-hidden relative shadow-2xl">
                        <GuardianFeed interventions={interventions} profileId={profileId} onClear={() => setInterventions([])} onRefresh={triggerManualScan} />
                        <div className="absolute bottom-4 left-4 right-4 bg-slate-950/90 border border-slate-700 rounded-2xl flex items-center p-2 backdrop-blur-md">
                            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-transparent border-none px-3 text-sm h-10 text-cyan-100 placeholder-slate-500" placeholder="Donner un ordre au Gardien..." />
                            <button onClick={handleSendMessage} className="bg-cyan-700 text-white px-4 rounded-xl h-10 hover:bg-cyan-600"><Send size={16} /></button>
                        </div>
                    </div>
                </div>

                {/* CENTRE - GLOBE */}
                <div className="lg:col-span-1 bg-black/40 rounded-xl border border-slate-800 overflow-hidden relative">
                    <ShadowGlobe onLocationChange={() => addLog(`[NOEUD] Activité détectée`)} />
                </div>

                {/* DROITE - CANAUX ET LIAISONS */}
                <div className="lg:col-span-1 flex flex-col gap-6 h-full">
                    <div className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase">
                                <Radio size={14} className="animate-pulse" /> Liaisons Actives ({channels.length})
                            </div>
                        </div>

                        <div className="space-y-3 overflow-y-auto pr-2">
                            {channels.length > 0 ? (
                                channels.map((channel: any) => {
                                    // On détermine qui est l'autre personne
                                    const isMemberOne = channel.member_one_id === profileId;
                                    const partnerId = isMemberOne ? channel.member_two_id : channel.member_one_id;
                                    // Logic: member_one_id is ALWAYS set to initiatorId in archive/route.ts
                                    const iAmInitiator = isMemberOne;

                                    return (
                                        <div
                                            key={channel.id}
                                            className={`group p-4 rounded-2xl border transition-all mb-4 ${iAmInitiator
                                                ? 'bg-indigo-950/40 border-indigo-500/30 hover:border-indigo-400'
                                                : 'bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-400'
                                                }`}
                                        >
                                            <div className="cursor-pointer" onClick={() => router.push(`/dashboard/liaison/${partnerId}?profileId=${profileId}`)}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-[10px] font-mono font-bold tracking-tighter ${iAmInitiator ? 'text-indigo-400' : 'text-emerald-400'
                                                        }`}>
                                                        ID: {partnerId?.slice(0, 8)}
                                                    </span>

                                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${iAmInitiator
                                                        ? 'bg-indigo-500/20 text-indigo-300'
                                                        : 'bg-emerald-500/20 text-emerald-300'
                                                        }`}>
                                                        {iAmInitiator ? 'Sortant' : 'Entrant'}
                                                    </span>
                                                </div>

                                                <div className="text-sm font-bold text-slate-200">
                                                    {channel.topic || "Liaison Technique"}
                                                </div>

                                                <p className="text-[10px] text-slate-500 italic mt-1">
                                                    {iAmInitiator
                                                        ? "Tu as localisé ce partenaire."
                                                        : "Ce partenaire t'a sollicité."}
                                                </p>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-white/5">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Évite d'ouvrir la page pleine en même temps
                                                        console.log("CLICK - ID du canal sélectionné :", channel.id); // <--- Vérifie que cet ID s'affiche au clic

                                                        setActiveChannelId(channel.id); // <--- Stockage dans la variable d'état
                                                        setChatPartnerId(partnerId);
                                                        setIsChatOpen(true);
                                                        addLog(`[COMM] Ouverture canal direct avec ${partnerId.slice(0, 8)}`);
                                                    }}
                                                    className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${iAmInitiator
                                                        ? 'bg-indigo-600 hover:bg-indigo-500'
                                                        : 'bg-emerald-600 hover:bg-emerald-500'
                                                        } text-white shadow-lg`}
                                                >
                                                    <MessageCircle size={12} /> Démarrer le Chat
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-10 opacity-30 text-[10px] uppercase tracking-widest">
                                    Aucune liaison active
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* PANNEAU CORTEX DATA (MODAL) */}
            {showCortexPanel && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <BrainCircuit className="text-cyan-400" /> Gestion des Données Neurales
                            </h2>
                            <button onClick={() => setShowCortexPanel(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><X /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <KnowledgeIngester
                                profileId={profileId}
                                memories={memories}
                                onRefresh={() => loadMemories(profileId!)}
                            />
                        </div>
                    </div>
                </div>
            )}



            {/* NOTIFICATION DE PING ENTRANT */}
            {activeRequest && (
                <div className="fixed top-24 right-8 z-[120] animate-in slide-in-from-right-full duration-500">
                    <div className="bg-indigo-950/80 border border-indigo-500 p-6 rounded-3xl backdrop-blur-xl shadow-[0_0_30px_rgba(99,102,241,0.4)] w-80">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-500/20 rounded-full text-indigo-400">
                                <UserPlus size={20} />
                            </div>
                            <div>
                                <h4 className="text-white font-black text-xs uppercase tracking-widest">Demande de Contact</h4>
                                <p className="text-[10px] text-indigo-400 font-mono">ID: {activeRequest.requester_id.slice(0, 8)}</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-200 mb-6 italic leading-relaxed">
                            "{activeRequest.topic}"
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePingAccept(activeRequest)}
                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black rounded-xl transition-all uppercase"
                            >
                                Accepter
                            </button>
                            <button
                                onClick={() => setActiveRequest(null)}
                                className="px-4 py-2 border border-slate-700 text-slate-500 text-[10px] font-bold rounded-xl hover:bg-slate-800 transition-all uppercase"
                            >
                                Refuser
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- FENÊTRE DE CHAT (LIAISON DIRECTE) --- */}
            {/* --- FENÊTRE DE CHAT (LIAISON DIRECTE) --- */}
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