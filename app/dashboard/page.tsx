'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Radio, MessageCircle, Send, X, Volume2, VolumeX, Activity, Mic, MicOff, Check, UserPlus } from 'lucide-react';
import ShadowGlobe from '@/components/shadow-globe';

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

    // Tchat & Mission
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'twin', content: string }>>([]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [lastFoundClone, setLastFoundClone] = useState<string | null>(null);
    const [lastMissionQuery, setLastMissionQuery] = useState<string>(""); // On garde en mémoire la recherche

    // Audio
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    // Messagerie & Requêtes
    const [activeContactId, setActiveContactId] = useState<string | null>(null);
    const [showMessaging, setShowMessaging] = useState(false);
    const [conversation, setConversation] = useState<any[]>([]);
    const [msgInput, setMsgInput] = useState('');

    // MODALE D'ACCEPTATION (NOUVEAU)
    const [pendingRequest, setPendingRequest] = useState<{ id: string, reason: string } | null>(null);

    // Cortex
    const [neuroInput, setNeuroInput] = useState('');
    const [isPrivateMemory, setIsPrivateMemory] = useState(false);
    const [isSavingMemory, setIsSavingMemory] = useState(false);
    const [showCortexPanel, setShowCortexPanel] = useState(false);
    const [cortexMemories, setCortexMemories] = useState<any[]>([]);

    const chatRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const msgEndRef = useRef<HTMLDivElement>(null);

    // --- LOGS ---
    const addLog = (msg: string) => { setLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString('fr-FR', { hour12: false })}] ${msg}`]); };

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
        const fetchContacts = async () => { try { const res = await fetch(`/api/contacts?profileId=${profileId}`); const data = await res.json(); if (data.contacts) setContacts(data.contacts); } catch (e) { } };
        fetchContacts();
        const interval = setInterval(fetchContacts, 4000);
        return () => clearInterval(interval);
    }, [profileId]);

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

    // --- GESTION DES CONTACTS ET DEMANDES ---
    const handleContactClick = (contact: any) => {
        // SI C'EST UNE MISSION (Ping reçu)
        if (contact.lastMessage && contact.lastMessage.startsWith('🕵️ MISSION')) {
            setPendingRequest({
                id: contact.id,
                reason: contact.lastMessage
            });
        } else {
            // Sinon ouverture normale
            handleOpenChat(contact.id);
        }
    };

    const handleAcceptRequest = () => {
        if (!pendingRequest) return;
        // On ouvre le chat
        handleOpenChat(pendingRequest.id);
        // On envoie un message automatique pour valider
        handleSendP2PMessage(pendingRequest.id, "Liaison acceptée. Je vous écoute.");
        setPendingRequest(null);
    };

    const handleOpenChat = async (contactId: string) => {
        setActiveContactId(contactId);
        setShowMessaging(true);
        addLog(`[CONNEXION] Canal sécurisé ouvert vers ${contactId.slice(0, 5)}...`);
        try {
            await fetch('/api/messages/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromId: contactId, toId: profileId })
            });
        } catch (e) { console.error(e); }
    };

    const handleSendP2PMessage = async (targetId = activeContactId, content = msgInput) => {
        if (!content.trim() || !targetId) return;
        try {
            const res = await fetch('/api/messages/send', {
                method: 'POST',
                body: JSON.stringify({ fromId: profileId, toId: targetId, content: content })
            });
            if (res.ok) {
                setConversation(prev => [...prev, { fromId: profileId, content: content, createdAt: new Date() }]);
                setMsgInput('');
            }
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

    // --- MISSION ---
    const handleMission = async () => {
        if (!chatInput.trim()) return;
        const missionQuery = chatInput;
        setLastMissionQuery(missionQuery); // On stocke la recherche
        setChatMessages(prev => [...prev, { role: 'user', content: `🚀 MISSION : ${missionQuery}` }]);
        setChatInput('');
        setIsThinking(true);
        addLog(`[MISSION] Scan: ${missionQuery.substring(0, 15)}...`);

        try {
            const res = await fetch('/api/mission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mission: missionQuery, profileId })
            });
            const data = await res.json();

            let aiContent = "";
            if (data.candidates && data.candidates.length > 0) {
                setLastFoundClone(data.candidates[0].cloneId);
                aiContent = data.message || `🎯 Cible localisée : ${data.candidates.length} profil(s).`;
            } else {
                aiContent = data.message || "🕵️‍♂️ Aucun résultat probant dans le secteur.";
                setLastFoundClone(null);
            }
            addLog(`[RÉSULTAT] ${aiContent.substring(0, 30)}...`);
            setChatMessages(prev => [...prev, { role: 'twin', content: aiContent }]);
            if (audioEnabled) speakText(aiContent);

        } catch (e) {
            setChatMessages(prev => [...prev, { role: 'twin', content: "Échec critique de la mission." }]);
        } finally {
            setIsThinking(false);
        }
    };

    // --- PING AVEC RAISON ---
    const handlePing = async () => {
        if (!lastFoundClone) return;
        addLog(`[PING] Signal envoyé vers ${lastFoundClone.substring(0, 5)}...`);

        const reasonText = `🕵️ MISSION : Recherche "${lastMissionQuery}"`;
        setChatMessages(prev => [...prev, { role: 'twin', content: `📡 PING transmis : "${reasonText}"` }]);

        try {
            await fetch('/api/ping', {
                method: 'POST',
                body: JSON.stringify({
                    fromId: profileId,
                    toId: lastFoundClone,
                    reason: reasonText // ON ENVOIE LE TEXTE ICI
                })
            });
        } catch (e) { }
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
        if (!profileId) return;
        try {
            const res = await fetch(`/api/memories?profileId=${profileId}`);
            const data = await res.json();
            if (data.memories) {
                const cleanMemories = data.memories.filter((m: any) => m.content && m.content !== 'N/A' && (m.type === 'thought' || m.type === 'private' || m.type === 'document')).map((m: any) => ({ ...m, content: m.content || m.encryptedContent || "Donnée illisible" }));
                setCortexMemories(cleanMemories);
            }
        } catch (e) { }
    };

    const handleDeleteMemory = async (id: string) => {
        if (!confirm("Supprimer ?")) return;
        setCortexMemories(prev => prev.filter(m => m.id !== id));
        setMemories(prev => prev.filter(m => m.id !== id));
        try { await fetch('/api/memories/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); addLog("[CORTEX] Fragment supprimé."); } catch (e) { }
    };

    // --- RENDU ---
    if (!profileId || !isInitialized) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-mono"><div className="text-4xl mb-4 animate-spin">🧬</div><div className="text-red-500 animate-pulse">ACCÈS NON AUTORISÉ. REDIRECTION...</div></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 text-white p-4 md:p-6 font-sans overflow-hidden">
            <div className="max-w-7xl mx-auto pt-4 mb-6 flex justify-between items-center border-b border-slate-800 pb-4">
                <div><h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent font-mono">MISSION CONTROL</h1><p className="text-xs text-slate-500">v2.1.4-COMM • {profileId.slice(0, 8)}...</p></div>
                <div className="flex gap-4 items-center">
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

                    <div className="lg:col-span-1 flex flex-col h-full bg-black/40 rounded-xl border border-slate-800 overflow-hidden relative">
                        <div className="absolute top-2 left-2 z-10 text-xs font-bold text-slate-500 bg-black/50 px-2 rounded">RÉSEAU OMBRE</div>
                        <ShadowGlobe onLocationChange={(city) => addLog(`[NOEUD] ${city} actif`)} />
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
                        <div className="h-1/2 bg-black border border-slate-800 rounded-xl p-3 flex flex-col font-mono text-xs">
                            <div className="text-slate-500 border-b border-slate-800 mb-2 pb-1">LOGS SYSTÈME</div>
                            <div ref={terminalRef} className="flex-1 overflow-y-auto text-green-500/80 space-y-1">{logs.map((l, i) => <div key={i}>{l}</div>)}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-6 right-6 z-50"><button onClick={openCortex} className="p-4 bg-slate-900 border-2 border-purple-500 rounded-full shadow-lg text-white hover:scale-110 transition-transform"><span className="text-2xl">🧠</span></button></div>

            {showCortexPanel && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                    <div className="w-full max-w-3xl bg-slate-900 rounded-2xl border border-slate-700 flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-slate-700 flex justify-between"><h2 className="font-bold text-white">🧠 CORTEX</h2><button onClick={() => setShowCortexPanel(false)} className="text-white">✖</button></div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">{cortexMemories.length === 0 && <div className="text-slate-500 text-center italic mt-10">Cortex vide (Tchat filtré).</div>}{cortexMemories.map((m, i) => (<div key={i} className="p-3 bg-slate-800 rounded border border-slate-700 flex justify-between items-center text-white group"><div className="text-sm truncate max-w-[80%]">{m.content}</div><button onClick={() => handleDeleteMemory(m.id)} className="text-slate-600 hover:text-red-500 transition-colors p-2">🗑️</button></div>))}</div>
                    </div>
                </div>
            )}

            {/* MODALE ACCEPTATION MISSION (NOUVEAU) */}
            {pendingRequest && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="w-full max-w-lg bg-slate-900 border border-green-500 rounded-xl shadow-[0_0_50px_rgba(34,197,94,0.3)] p-6 text-center">
                        <div className="w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500 animate-pulse">
                            <UserPlus size={32} className="text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">DEMANDE DE LIAISON</h2>
                        <p className="text-slate-400 text-sm mb-6">Le profil <span className="text-white font-mono">{pendingRequest.id}</span> souhaite établir une connexion sécurisée.</p>

                        <div className="bg-black/50 p-4 rounded-lg border border-slate-700 mb-6 text-left">
                            <p className="text-xs text-green-500 uppercase font-bold mb-1">MOTIF DE LA MISSION :</p>
                            <p className="text-white font-mono text-sm">"{pendingRequest.reason.replace('🕵️ MISSION :', '').trim()}"</p>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setPendingRequest(null)} className="flex-1 py-3 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800">IGNORER</button>
                            <button onClick={handleAcceptRequest} className="flex-1 py-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500 shadow-lg shadow-green-900/50">ACCEPTER</button>
                        </div>
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
        </div>
    );
}