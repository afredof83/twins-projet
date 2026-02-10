'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Radio, MessageCircle, Send, X, Volume2, VolumeX, Activity, Mic, MicOff, UserPlus, Trash2, CheckSquare, BrainCircuit, AlertTriangle } from 'lucide-react';
import ShadowGlobe from '@/components/shadow-globe';
import SocialBridge from '@/components/social-bridge';
import CommlinkButton from '@/components/CommlinkButton';

// --- SONS SFX ---
const SFX = {
    LAUNCH: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3',
    SUCCESS: 'https://cdn.pixabay.com/audio/2022/03/15/audio_73199d146c.mp3',
    PING: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c3943905c1.mp3',
    CONNECT: 'https://cdn.pixabay.com/audio/2022/03/24/audio_03e06c4b26.mp3',
    DELETE: 'https://cdn.pixabay.com/audio/2022/03/10/audio_5b38383796.mp3'
};

// --- 1. SAFE MISSION CONTROL ---
const SafeMissionControl = ({ count }: { count: number }) => {
    const syncRate = Math.min(100, Math.floor(count * 5));
    return (
        <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>Systèmes Vitaux
            </h3>
            <div className="space-y-6">
                <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-blue-400 font-mono">Taux de Synchro</span><span className="text-white font-bold">{syncRate}%</span></div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-1000" style={{ width: `${syncRate}%` }}></div></div>
                </div>
                <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-purple-400 font-mono">Fragments Mémoire</span><span className="text-white font-bold">{count}</span></div>
                    <div className="grid grid-cols-10 gap-1">{[...Array(10)].map((_, i) => (<div key={i} className={`h-1 rounded-full transition-all delay-[${i * 50}ms] ${i < (Math.min(count, 50) / 5) ? 'bg-purple-500 shadow-[0_0_5px_#a855f7]' : 'bg-slate-800'}`}></div>))}</div>
                </div>
            </div>
        </div>
    );
};

// --- 2. DASHBOARD MAIN ---
export default function MissionControl() {
    const searchParams = useSearchParams();
    const profileId = searchParams.get('profileId');
    const router = useRouter();

    useEffect(() => { if (!profileId) router.push('/'); }, [profileId, router]);

    // Etats
    const [isInitialized, setIsInitialized] = useState(false);
    const [memories, setMemories] = useState<any[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);

    // NOUVEAU : Mode Sentinelle (Autonome)
    const [isSentinelActive, setIsSentinelActive] = useState(false);

    // Tchat & Mission
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'twin', content: string }>>([]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [lastFoundClone, setLastFoundClone] = useState<string | null>(null);
    const [lastMissionQuery, setLastMissionQuery] = useState<string>("");

    // Audio & SFX
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    // Messagerie & Requêtes
    const [activeContactId, setActiveContactId] = useState<string | null>(null);
    const [showMessaging, setShowMessaging] = useState(false);
    const [conversation, setConversation] = useState<any[]>([]);
    const [msgInput, setMsgInput] = useState('');

    // MODALE D'ACCEPTATION
    const [pendingRequest, setPendingRequest] = useState<{ id: string, reason: string } | null>(null);

    // Cortex & Sélection Multiple
    const [neuroInput, setNeuroInput] = useState('');
    const [isPrivateMemory, setIsPrivateMemory] = useState(false);
    const [isSavingMemory, setIsSavingMemory] = useState(false);
    const [showCortexPanel, setShowCortexPanel] = useState(false);
    const [cortexMemories, setCortexMemories] = useState<any[]>([]);
    const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);

    const chatRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const msgEndRef = useRef<HTMLDivElement>(null);

    // --- LOGS ---
    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString('fr-FR');
        // Utilisation de la callback pour garantir l'état à jour
        setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
    };

    // --- MOTEUR SFX ---
    const playSFX = (url: string) => {
        if (!audioEnabled) return;
        try {
            const audio = new Audio(url);
            audio.volume = 0.4;
            audio.play().catch(e => console.log("SFX bloqué", e));
        } catch (e) { console.error("Erreur SFX", e); }
    };

    // LE CYCLE DE CONSCIENCE (S'exécute en boucle si la Sentinelle est ON)
    useEffect(() => {
        if (!isSentinelActive || !profileId) return;

        const runAutonomousCycle = async () => {
            addLog("[SENTINELLE] Cycle de conscience initié...");

            try {
                const reflectRes = await fetch('/api/cortex/reflect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profileId })
                });

                if (!reflectRes.ok) throw new Error("Erreur de liaison API");

                const reflectData = await reflectRes.json();
                console.log("🔍 RÉPONSE DU CORTEX :", reflectData);

                // NOUVEAU : Vérification ultra-sécurisée de la structure
                // Correctif Anti-Crash
                const thoughtText = reflectData.thought?.thought || "Réflexion silencieuse...";
                const displayThought = typeof thoughtText === 'string' ? thoughtText.substring(0, 40) : "Donnée brute";

                addLog(`[CORTEX] Pensée : "${displayThought}..."`);

                if (audioEnabled) {
                    speakText(thoughtText);
                }

                // Déclenchement des actions secondaires si elles existent
                if (reflectData.thought?.shouldSearch && reflectData.thought?.searchQuery) {
                    const query = reflectData.thought.searchQuery;
                    addLog(`[CURIOSITÉ] Recherche autonome : ${query}`);

                    const scanRes = await fetch('/api/mission', {
                        method: 'POST',
                        body: JSON.stringify({ mission: query, profileId })
                    });
                    const scanData = await scanRes.json();

                    // 3. PHASE D'ACTION
                    if (scanData.candidates?.length > 0 && scanData.candidates[0].compatibility > 85) {
                        const target = scanData.candidates[0].cloneId;
                        addLog(`[LIAISON] Cible haute compatibilité identifiée : ${target.slice(0, 5)}`);

                        await fetch('/api/ping', {
                            method: 'POST',
                            body: JSON.stringify({
                                fromId: profileId,
                                toId: target,
                                reason: `[AUTONOME] Convergence détectée sur : ${query}`
                            })
                        });
                        playSFX(SFX.PING);
                    }
                }

            } catch (e: any) {
                addLog(`[ERREUR SYSTÈME] : ${e.message || "Interruption du signal"}`);
                console.error("Détails du crash Sentinelle :", e);
            }
        };

        const interval = setInterval(runAutonomousCycle, 300000); // Toutes les 5 minutes
        runAutonomousCycle(); // Lancement immédiat

        return () => clearInterval(interval);
    }, [isSentinelActive, profileId]);

    // --- INIT ---
    useEffect(() => {
        let mounted = true;
        const initSequence = async () => {
            if (profileId) {
                await new Promise(r => setTimeout(r, 800));
                if (mounted) { setIsInitialized(true); loadMemories(); addLog('[BOOT] Système en ligne.'); }
            }
        };
        initSequence();

        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.lang = 'fr-FR';
            recognitionRef.current.interimResults = false;
            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setChatInput(prev => (prev + " " + transcript).trim());
                setIsListening(false);
            };
            recognitionRef.current.onend = () => setIsListening(false);
        }
        return () => { mounted = false; };
    }, [profileId]);

    // SYNC CONTACTS
    useEffect(() => {
        if (!profileId) return;
        const fetchContacts = async () => {
            try {
                const res = await fetch(`/api/contacts?profileId=${profileId}`);
                const data = await res.json();
                if (data.contacts) {
                    setContacts(data.contacts);
                    const hasNewMission = data.contacts.some((c: any) => c.lastMessage && c.lastMessage.startsWith('🕵️ MISSION') && c.hasUnread);
                    if (hasNewMission) playSFX(SFX.PING);
                }
            } catch (e) { }
        };
        fetchContacts();
        const interval = setInterval(fetchContacts, 4000);
        return () => clearInterval(interval);
    }, [profileId, audioEnabled]);

    // SYNC MESSAGES
    useEffect(() => {
        if (!profileId || !activeContactId || !showMessaging) return;
        const loadHistory = async () => {
            try {
                const res = await fetch(`/api/messages/history?myId=${profileId}&contactId=${activeContactId}`);
                const data = await res.json();
                if (data.messages) setConversation(data.messages);
            } catch (e) { console.error(e); }
        };
        loadHistory();
        const interval = setInterval(loadHistory, 3000);
        return () => clearInterval(interval);
    }, [profileId, activeContactId, showMessaging]);

    useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatMessages]);
    useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [logs]);
    useEffect(() => { if (msgEndRef.current) msgEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [conversation]);

    // --- ACTIONS ---
    const speakText = async (text: string) => {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (!audioEnabled || !text) return;
        setIsSpeaking(true);
        try {
            const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.substring(0, 200) }) });
            if (!res.ok) throw new Error("Erreur Audio");
            const blob = await res.blob();
            const audio = new Audio(URL.createObjectURL(blob));
            audio.onended = () => setIsSpeaking(false);
            audio.play();
        } catch (e) { setIsSpeaking(false); }
    };

    const toggleMic = () => {
        if (!recognitionRef.current) { alert("Micro non supporté"); return; }
        if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
        else { try { recognitionRef.current.start(); setIsListening(true); } catch (e) { } }
    };

    const loadMemories = async () => {
        if (!profileId) return;
        try {
            const res = await fetch(`/api/memories?profileId=${profileId}`);
            const data = await res.json();
            if (data.memories) {
                const longTermMemories = data.memories.filter((m: any) => m.content && m.content !== 'N/A' && (m.type === 'thought' || m.type === 'private' || m.type === 'document'));
                setMemories(longTermMemories);
            }
        } catch (e) { }
    };

    const handleContactClick = (contact: any) => {
        if (contact.lastMessage && contact.lastMessage.startsWith('🕵️ MISSION')) {
            setPendingRequest({ id: contact.id, reason: contact.lastMessage });
            playSFX(SFX.PING);
        } else {
            handleOpenChat(contact.id);
        }
    };

    const handleAcceptRequest = () => {
        if (!pendingRequest) return;
        playSFX(SFX.CONNECT);
        handleOpenChat(pendingRequest.id);
        handleSendP2PMessage(pendingRequest.id, "Liaison acceptée. Je vous écoute.");
        setPendingRequest(null);
    };

    const handleOpenChat = async (contactId: string) => {
        setActiveContactId(contactId);
        setShowMessaging(true);
        addLog(`[CONNEXION] Canal sécurisé ouvert vers ${contactId.slice(0, 5)}...`);
        try {
            await fetch('/api/messages/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromId: contactId, toId: profileId }) });
        } catch (e) { console.error(e); }
    };

    const handleSendP2PMessage = async (targetId = activeContactId, content = msgInput) => {
        if (!content.trim() || !targetId) return;
        try {
            const res = await fetch('/api/messages/send', { method: 'POST', body: JSON.stringify({ fromId: profileId, toId: targetId, content: content }) });
            if (res.ok) { setConversation(prev => [...prev, { fromId: profileId, content: content, createdAt: new Date() }]); setMsgInput(''); }
        } catch (e) { alert("Erreur envoi"); }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || isThinking) return;
        const userMsg = chatInput;
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatInput('');
        setIsThinking(true);
        try {
            const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: userMsg, profileId }) });
            const data = await res.json();
            const reply = data.reply || data.response || "Silence radio.";
            setChatMessages(prev => [...prev, { role: 'twin', content: reply }]);
            if (audioEnabled) speakText(reply);
        } catch (e) { setChatMessages(prev => [...prev, { role: 'twin', content: "Erreur connexion." }]); }
        finally { setIsThinking(false); }
    };

    const handleMission = async () => {
        if (!chatInput.trim()) return;
        playSFX(SFX.LAUNCH);
        const missionQuery = chatInput;
        setLastMissionQuery(missionQuery);
        setChatMessages(prev => [...prev, { role: 'user', content: `🚀 MISSION : ${missionQuery}` }]);
        setChatInput('');
        setIsThinking(true);
        addLog(`[MISSION] Scan: ${missionQuery.substring(0, 15)}...`);

        try {
            const res = await fetch('/api/mission', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mission: missionQuery, profileId }) });
            const data = await res.json();
            let aiContent = "";
            if (data.candidates && data.candidates.length > 0) {
                playSFX(SFX.SUCCESS);
                setLastFoundClone(data.candidates[0].cloneId);
                aiContent = data.message || `🎯 Cible localisée : ${data.candidates.length} profil(s).`;
            } else {
                aiContent = data.message || "🕵️‍♂️ Aucun résultat probant dans le secteur.";
                setLastFoundClone(null);
            }
            addLog(`[RÉSULTAT] ${aiContent.substring(0, 30)}...`);
            setChatMessages(prev => [...prev, { role: 'twin', content: aiContent }]);
            if (audioEnabled) speakText(aiContent);
        } catch (e) { setChatMessages(prev => [...prev, { role: 'twin', content: "Échec critique de la mission." }]); } finally { setIsThinking(false); }
    };

    const handlePing = async () => {
        if (!lastFoundClone) return;
        addLog(`[PING] Signal envoyé vers ${lastFoundClone.substring(0, 5)}...`);
        playSFX(SFX.PING);
        const reasonText = `🕵️ MISSION : Recherche "${lastMissionQuery}"`;
        setChatMessages(prev => [...prev, { role: 'twin', content: `📡 PING transmis : "${reasonText}"` }]);
        try { await fetch('/api/ping', { method: 'POST', body: JSON.stringify({ fromId: profileId, toId: lastFoundClone, reason: reasonText }) }); } catch (e) { }
    };

    const handleNeuroSave = async () => {
        if (!neuroInput.trim()) return;
        setIsSavingMemory(true);
        try {
            await fetch('/api/memories/add', { method: 'POST', body: JSON.stringify({ content: neuroInput, type: isPrivateMemory ? 'private' : 'thought', profileId }) });
            setNeuroInput(''); addLog('[MÉMOIRE] Sauvegardée.'); loadMemories();
        } catch (e) { } finally { setIsSavingMemory(false); }
    };

    const openCortex = async () => {
        setShowCortexPanel(true);
        setSelectedMemoryIds([]);
        if (!profileId) return;
        try {
            const res = await fetch(`/api/memories?profileId=${profileId}`);
            const data = await res.json();
            if (data.memories) {
                const cleanMemories = data.memories.map((m: any) => ({ ...m, content: m.content || m.encryptedContent || "Donnée illisible" }));
                setCortexMemories(cleanMemories);
            }
        } catch (e) { }
    };

    const toggleMemorySelection = (id: string) => {
        setSelectedMemoryIds(prev =>
            prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
        );
    };

    const selectAllMemories = () => {
        if (selectedMemoryIds.length === cortexMemories.length) {
            setSelectedMemoryIds([]);
        } else {
            setSelectedMemoryIds(cortexMemories.map(m => m.id));
        }
    };

    const handleDeleteSelected = async () => {
        const count = selectedMemoryIds.length;
        if (count === 0) return;
        if (!confirm(`Confirmer la suppression de ${count} élément(s) ?`)) return;

        setCortexMemories(prev => prev.filter(m => !selectedMemoryIds.includes(m.id)));
        setMemories(prev => prev.filter(m => !selectedMemoryIds.includes(m.id)));

        try {
            await fetch('/api/memories/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedMemoryIds })
            });
            playSFX(SFX.DELETE);
            addLog(`[CORTEX] ${count} fragments effacés.`);
            setSelectedMemoryIds([]);
        } catch (e) {
            alert("Erreur suppression");
        }
    };

    // --- RENDU ---
    if (!profileId || !isInitialized) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-mono"><div className="text-4xl mb-4 animate-spin">🧬</div><div className="text-red-500 animate-pulse">ACCÈS NON AUTORISÉ. REDIRECTION...</div></div>;

    return (
        <main className="relative min-h-[100dvh] w-full bg-slate-950 p-4 md:p-8 flex flex-col gap-6">
            <div className="max-w-7xl mx-auto pt-4 mb-6 flex justify-between items-center border-b border-slate-800 pb-4">
                <div><h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent font-mono">MISSION CONTROL</h1><p className="text-xs text-slate-500">v2.1.4-COMM • {profileId.slice(0, 8)}...</p></div>
                <div className="flex gap-4 items-center">
                    <CommlinkButton profileId={profileId} />
                    <button
                        onClick={() => setIsSentinelActive(!isSentinelActive)}
                        className={`px-4 py-2 rounded-lg font-mono text-xs transition-all flex items-center gap-2 border ${isSentinelActive
                            ? 'bg-red-900/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse'
                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'
                            }`}
                    >
                        <BrainCircuit size={14} />
                        {isSentinelActive ? 'SENTINELLE ACTIVE' : 'MODE MANUEL'}
                    </button>
                    <button onClick={() => setAudioEnabled(!audioEnabled)} className={`p-2 rounded-full border transition-all ${audioEnabled ? 'bg-green-900/30 text-green-400 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'}`}>{isSpeaking ? <Activity className="animate-pulse" size={20} /> : (audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />)}</button>
                    <div className="flex items-center gap-1 text-green-400 font-mono text-xs border border-green-900 bg-green-900/10 px-2 py-1 rounded">ONLINE</div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto h-full flex flex-col">
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-full max-w-xl z-50 px-4 hidden md:block">
                    <div className={`relative bg-slate-900/80 backdrop-blur-md border rounded-2xl shadow-2xl ${isSavingMemory ? 'border-purple-500' : 'border-slate-700'}`}>
                        <div className="flex items-center p-2">
                            <button onClick={() => setIsPrivateMemory(!isPrivateMemory)} className={`p-2 rounded-xl text-xs mr-2 border ${isPrivateMemory ? 'bg-red-900/30 text-red-400 border-red-500' : 'bg-green-900/30 text-green-400 border-green-500'}`}>{isPrivateMemory ? '🔒 PRIVÉ' : '🌐 ACTIF'}</button>
                            <input type="text" value={neuroInput} onChange={(e) => setNeuroInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleNeuroSave()} placeholder="Encoder un souvenir rapide..." className="flex-1 bg-transparent border-none text-white focus:ring-0 text-sm" disabled={isSavingMemory} />
                            <button onClick={handleNeuroSave} disabled={!neuroInput} className="p-2 ml-2">💾</button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 h-[600px]">
                    <div className="lg:col-span-2 flex flex-col gap-6 h-full">
                        <SafeMissionControl count={memories.length} />
                        <div className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
                            <div className="p-3 border-b border-slate-800 bg-slate-900/80 text-xs font-bold text-slate-400 flex justify-between"><span>INTERFACE NEURONALE</span>{isThinking && <span className="text-purple-400 animate-pulse">Réflexion...</span>}</div>
                            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {chatMessages.map((msg, idx) => (<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-800 border border-slate-700'}`}>{msg.content}</div></div>))}
                            </div>
                            <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center">
                                <button onClick={toggleMic} className={`p-2 rounded-lg transition-all ${isListening ? 'bg-red-900/50 text-red-500 animate-pulse border border-red-500' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}>{isListening ? <MicOff size={18} /> : <Mic size={18} />}</button>
                                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-transparent border border-slate-700 rounded-lg px-3 text-sm focus:border-purple-500 outline-none h-10" placeholder={isListening ? "Écoute..." : "Message ou Mission..."} />
                                <button onClick={handleSendMessage} className="bg-purple-600 text-white px-3 rounded-lg h-10 hover:bg-purple-500">➤</button>
                                <button onClick={handleMission} className="bg-blue-600 text-white px-3 rounded-lg h-10 hover:bg-blue-500">🚀</button>
                                {lastFoundClone && <button onClick={handlePing} className="bg-green-600 text-white px-3 rounded-lg h-10 hover:bg-green-500 animate-pulse">📡</button>}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-6 h-full">
                        <div className="h-1/2 bg-black/40 rounded-xl border border-slate-800 overflow-hidden relative">
                            <div className="absolute top-2 left-2 z-10 text-xs font-bold text-slate-500 bg-black/50 px-2 rounded">RÉSEAU OMBRE</div>
                            <ShadowGlobe onLocationChange={(city) => addLog(`[NOEUD] ${city} actif`)} />
                        </div>
                        <div className="h-1/2 flex flex-col justify-end">
                            <SocialBridge profileId={profileId} onSyncComplete={() => { playSFX(SFX.SUCCESS); addLog("[CORTEX] Nouvelle compétence sociale acquise."); loadMemories(); }} />
                        </div>
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-6 h-full">
                        <div className="h-1/2 bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2"><div className="flex items-center gap-2 text-xs font-bold text-green-400 uppercase"><Radio size={14} /> CANAUX SÉCURISÉS</div><span className="text-[10px] text-slate-500 bg-slate-800 px-2 rounded-full">{contacts.length}</span></div>
                            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                                {contacts.length === 0 ? (<div className="text-center text-slate-600 text-xs mt-10 italic">Aucun signal.</div>) : (
                                    contacts.map((contact) => {
                                        const isMissionRequest = contact.lastMessage && contact.lastMessage.startsWith('🕵️ MISSION');
                                        return (
                                            <button key={contact.id} onClick={() => handleContactClick(contact)} className={`w-full text-left p-3 rounded-lg border flex items-center justify-between group transition-all ${isMissionRequest ? 'bg-green-900/30 border-green-500 animate-pulse' : 'bg-slate-800/30 border-slate-800 hover:bg-slate-800'}`}>
                                                <div className="overflow-hidden">
                                                    <div className="font-bold text-xs text-slate-300 flex items-center gap-2">
                                                        {contact.id.slice(0, 10)}...
                                                        {isMissionRequest && <span className="text-green-400 text-[10px] bg-green-900/50 px-1 rounded">REQ</span>}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 truncate mt-1">
                                                        {isMissionRequest ? "🔔 Nouvelle demande de liaison !" : contact.lastMessage}
                                                    </div>
                                                </div>
                                                {isMissionRequest ? <UserPlus size={16} className="text-green-500" /> : <MessageCircle size={16} className="text-slate-600 group-hover:text-white" />}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                        <div className="h-64 md:h-96 overflow-y-auto font-mono text-xs p-4 bg-black/50 border border-slate-800 rounded-lg">
                            {logs.map((log, i) => (
                                <div key={i} className="mb-1">{log}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-6 right-6 z-50"><button onClick={openCortex} className="p-4 bg-slate-900 border-2 border-purple-500 rounded-full shadow-lg text-white hover:scale-110 transition-transform"><span className="text-2xl">🧠</span></button></div>

            {showCortexPanel && (
                <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col animate-in fade-in duration-300">
                    {/* EN-TÊTE FIXE (AVEC BOUTONS D'ACTION) */}
                    <div className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-900/30 rounded-lg"><BrainCircuit className="text-purple-400" size={24} /></div>
                            <div>
                                <h2 className="font-bold text-white text-lg tracking-wide">CORTEX</h2>
                                <p className="text-[10px] text-slate-400 font-mono uppercase">Base de connaissances • {cortexMemories.length} entrées</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* ZONE D'ACTION : Supprimer apparaît ICI maintenant */}
                            {selectedMemoryIds.length > 0 && (
                                <div className="flex items-center gap-2 mr-4 bg-red-900/20 px-3 py-1 rounded-full border border-red-900/50 animate-in slide-in-from-right-5">
                                    <span className="text-xs text-red-200 font-mono">{selectedMemoryIds.length} sélectionné(s)</span>
                                    <button onClick={handleDeleteSelected} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-900/40">
                                        <Trash2 size={14} /> SUPPRIMER
                                    </button>
                                </div>
                            )}

                            <div className="h-8 w-px bg-slate-800 mx-2"></div>

                            <button onClick={selectAllMemories} className="text-xs font-mono text-slate-400 hover:text-white hover:underline">
                                {selectedMemoryIds.length === cortexMemories.length ? "DÉSÉLECTIONNER TOUT" : "TOUT SÉLECTIONNER"}
                            </button>

                            <button onClick={() => setShowCortexPanel(false)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors ml-2">
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* CORPS DÉFILABLE (Plein écran) */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-950/50">
                        {cortexMemories.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50">
                                <BrainCircuit size={64} className="mb-4" />
                                <p className="text-xl font-mono">Cortex vide.</p>
                                <p className="text-sm">Ajoutez des souvenirs via le Dashboard.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
                                {cortexMemories.map((m) => {
                                    const isSelected = selectedMemoryIds.includes(m.id);
                                    return (
                                        <div key={m.id}
                                            onClick={() => toggleMemorySelection(m.id)}
                                            className={`group relative p-4 rounded-xl border flex flex-col gap-3 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${isSelected ? 'bg-purple-900/20 border-purple-500 ring-1 ring-purple-500' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-slate-600 bg-transparent group-hover:border-slate-400'}`}>
                                                    {isSelected && <CheckSquare size={14} className="text-white" />}
                                                </div>
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${m.type === 'document' ? 'bg-blue-900/30 text-blue-400 border border-blue-900' : 'bg-slate-800 text-slate-500'}`}>
                                                    {m.type}
                                                </span>
                                            </div>

                                            <div className="text-sm text-slate-300 font-mono line-clamp-4 leading-relaxed">
                                                {m.content}
                                            </div>

                                            <div className="mt-auto pt-3 border-t border-slate-800/50 flex justify-between items-center text-[10px] text-slate-500">
                                                <span className="truncate max-w-[150px] opacity-70">{m.source || 'Manuel'}</span>
                                                <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODALE ET MESSAGERIE (Inchangé) */}
            {pendingRequest && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="w-full max-w-lg bg-slate-900 border border-green-500 rounded-xl shadow-[0_0_50px_rgba(34,197,94,0.3)] p-6 text-center">
                        <div className="w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500 animate-pulse"><UserPlus size={32} className="text-green-400" /></div>
                        <h2 className="text-2xl font-bold text-white mb-2">DEMANDE DE LIAISON</h2>
                        <p className="text-slate-400 text-sm mb-6">Le profil <span className="text-white font-mono">{pendingRequest.id}</span> souhaite établir une connexion sécurisée.</p>
                        <div className="bg-black/50 p-4 rounded-lg border border-slate-700 mb-6 text-left"><p className="text-xs text-green-500 uppercase font-bold mb-1">MOTIF DE LA MISSION :</p><p className="text-white font-mono text-sm">"{pendingRequest.reason.replace('🕵️ MISSION :', '').trim()}"</p></div>
                        <div className="flex gap-4"><button onClick={() => setPendingRequest(null)} className="flex-1 py-3 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800">IGNORER</button><button onClick={handleAcceptRequest} className="flex-1 py-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500 shadow-lg shadow-green-900/50">ACCEPTER</button></div>
                    </div>
                </div>
            )}
            {showMessaging && activeContactId && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="w-full max-w-2xl bg-black border border-green-500/50 rounded-lg shadow-[0_0_50px_rgba(34,197,94,0.2)] flex flex-col h-[600px] font-mono">
                        <div className="p-4 border-b border-green-900 flex justify-between items-center bg-green-900/10"><h2 className="text-green-500 font-bold">CANAL SÉCURISÉ: {activeContactId.slice(0, 8)}...</h2><button onClick={() => setShowMessaging(false)} className="text-green-700 hover:text-green-500"><X size={24} /></button></div>
                        <div className="flex-1 overflow-y-auto p-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] space-y-4">
                            {conversation.length === 0 ? <div className="text-center text-green-900 mt-10">Initialisation...</div> : conversation.map((msg, i) => { const isMe = msg.fromId === profileId; return (<div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[70%] p-3 rounded-sm border ${isMe ? 'border-green-500 bg-green-900/20 text-green-100 text-right' : 'border-slate-700 bg-slate-900/80 text-slate-300'}`}><p className="text-sm">{msg.content}</p><p className="text-[10px] opacity-50 mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</p></div></div>); })}
                            <div ref={msgEndRef} />
                        </div>
                        <div className="p-4 border-t border-green-900 bg-black flex gap-2">
                            <input type="text" value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendP2PMessage()} className="flex-1 bg-green-900/10 border border-green-900 rounded p-3 text-green-500 placeholder-green-900 focus:border-green-500 outline-none" placeholder="Transmettre données..." autoFocus />
                            <button onClick={() => handleSendP2PMessage()} className="p-3 bg-green-700 hover:bg-green-600 text-black font-bold rounded flex items-center gap-2"><Send size={18} /></button>
                        </div>
                    </div>
                </div>
            )}
            {/* ESPACE DE SÉCURITÉ EN BAS (VITAL POUR MOBILE) */}
            <div className="h-24 w-full flex-shrink-0" aria-hidden="true" />
        </main>
    );
}