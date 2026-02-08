'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Radio, MessageCircle, Send, X, Volume2, VolumeX, Activity, Mic, MicOff } from 'lucide-react';
import ShadowGlobe from '@/components/shadow-globe';

// --- 1. SAFE MISSION CONTROL (Stats Cortex) ---
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

    // --- REDIRECTION SÉCURITÉ ---
    useEffect(() => {
        if (!profileId) router.push('/');
    }, [profileId, router]);

    // Etats Données
    const [isInitialized, setIsInitialized] = useState(false);
    const [memories, setMemories] = useState<any[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);

    // Etats Chat
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'twin', content: string }>>([]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [lastFoundClone, setLastFoundClone] = useState<string | null>(null);

    // --- ETATS AUDIO & MICRO ---
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    // Etats Messagerie
    const [activeContactId, setActiveContactId] = useState<string | null>(null);
    const [showMessaging, setShowMessaging] = useState(false);
    const [conversation, setConversation] = useState<any[]>([]);
    const [msgInput, setMsgInput] = useState('');

    // UI Refs
    const chatRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);

    // Cortex
    const [neuroInput, setNeuroInput] = useState('');
    const [isPrivateMemory, setIsPrivateMemory] = useState(false);
    const [isSavingMemory, setIsSavingMemory] = useState(false);
    const [showCortexPanel, setShowCortexPanel] = useState(false);
    const [cortexMemories, setCortexMemories] = useState<any[]>([]);

    // --- INITIALISATION ---
    useEffect(() => {
        let mounted = true;
        const initSequence = async () => {
            if (profileId) {
                await new Promise(r => setTimeout(r, 800));
                if (mounted) { setIsInitialized(true); loadMemories(); addLog('[BOOT] Système en ligne.'); }
            }
        };
        initSequence();

        // Init Micro
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
                if (data.contacts) setContacts(data.contacts);
            } catch (e) { }
        };
        fetchContacts();
        const interval = setInterval(fetchContacts, 4000);
        return () => clearInterval(interval);
    }, [profileId]);

    // SCROLL
    useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatMessages]);
    useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [logs]);

    // --- FONCTIONS AUDIO ---
    const speakText = async (text: string) => {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (!audioEnabled || !text) return;

        setIsSpeaking(true);
        try {
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.substring(0, 200) })
            });
            if (!res.ok) throw new Error("Erreur Audio");
            const blob = await res.blob();
            const audio = new Audio(URL.createObjectURL(blob));
            audio.onended = () => setIsSpeaking(false);
            audio.play();
        } catch (e) {
            console.error(e);
            setIsSpeaking(false);
        }
    };

    const toggleMic = () => {
        if (!recognitionRef.current) { alert("Micro non supporté"); return; }
        if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
        else { try { recognitionRef.current.start(); setIsListening(true); } catch (e) { } }
    };

    // --- ACTIONS LOGIQUE ---
    const addLog = (msg: string) => { setLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString('fr-FR', { hour12: false })}] ${msg}`]); };

    const loadMemories = async () => {
        if (!profileId) return;
        try {
            const res = await fetch(`/api/memories?profileId=${profileId}`);
            const data = await res.json();
            // FILTRE : On ne garde que les vrais souvenirs (pas les N/A)
            if (data.memories) setMemories(data.memories.filter((m: any) => m.content && m.content !== 'N/A'));
        } catch (e) { }
    };

    const handleOpenChat = async (contactId: string) => {
        setActiveContactId(contactId);
        setShowMessaging(true);
        addLog(`[CONNEXION] Canal sécurisé ouvert vers ${contactId.slice(0, 5)}...`);
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

            // DECLENCHEUR AUDIO
            if (audioEnabled) speakText(reply);

        } catch (e) { setChatMessages(prev => [...prev, { role: 'twin', content: "Erreur connexion." }]); }
        finally { setIsThinking(false); }
    };

    const handleNeuroSave = async () => {
        if (!neuroInput.trim()) return;
        setIsSavingMemory(true);
        try {
            await fetch('/api/memories/add', { method: 'POST', body: JSON.stringify({ content: neuroInput, type: isPrivateMemory ? 'private' : 'thought', profileId }) });
            setNeuroInput(''); addLog('[MÉMOIRE] Sauvegardée.'); loadMemories();
        } catch (e) { } finally { setIsSavingMemory(false); }
    };

    // --- GESTION CORTEX (Correctifs ICI) ---
    const openCortex = async () => {
        setShowCortexPanel(true);
        if (!profileId) return;
        try {
            const res = await fetch(`/api/memories?profileId=${profileId}`);
            const data = await res.json();
            if (data.memories) {
                // On filtre les N/A pour l'affichage
                const cleanMemories = data.memories
                    .filter((m: any) => m.content && m.content !== 'N/A' && m.content.length > 2)
                    .map((m: any) => ({ ...m, content: m.content || m.encryptedContent || "Donnée illisible" }));
                setCortexMemories(cleanMemories);
            }
        } catch (e) { }
    };

    const handleDeleteMemory = async (id: string) => {
        if (!confirm("Supprimer ce souvenir définitivement ?")) return;

        // Optimiste update (on supprime de l'écran tout de suite)
        setCortexMemories(prev => prev.filter(m => m.id !== id));
        setMemories(prev => prev.filter(m => m.id !== id));

        try {
            await fetch('/api/memories/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            addLog("[CORTEX] Fragment supprimé.");
        } catch (e) {
            console.error("Erreur suppression", e);
            addLog("[ERREUR] Échec suppression.");
        }
    };

    // --- RENDU ---
    if (!profileId || !isInitialized) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-mono">
                <div className="text-4xl mb-4 animate-spin">🧬</div>
                <div className="text-red-500 animate-pulse">ACCÈS NON AUTORISÉ. REDIRECTION...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 text-white p-4 md:p-6 font-sans overflow-hidden">

            {/* HEADER BAR */}
            <div className="max-w-7xl mx-auto pt-4 mb-6 flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent font-mono">MISSION CONTROL</h1>
                    <p className="text-xs text-slate-500">v2.1.4-COMM • {profileId.slice(0, 8)}...</p>
                </div>
                <div className="flex gap-4 items-center">
                    {/* BOUTON AUDIO */}
                    <button
                        onClick={() => setAudioEnabled(!audioEnabled)}
                        className={`p-2 rounded-full border transition-all ${audioEnabled
                                ? 'bg-green-900/30 text-green-400 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                                : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                            }`}
                        title="Activer/Désactiver la Voix"
                    >
                        {isSpeaking ? <Activity className="animate-pulse" size={20} /> : (audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />)}
                    </button>
                    <div className="flex items-center gap-1 text-green-400 font-mono text-xs border border-green-900 bg-green-900/10 px-2 py-1 rounded">ONLINE</div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto h-full flex flex-col">
                {/* INPUT NEURONAL FLOTTANT */}
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
                    {/* COLONNE GAUCHE (CHAT) */}
                    <div className="lg:col-span-2 flex flex-col gap-6 h-full">
                        <SafeMissionControl count={memories.length} />
                        <div className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
                            <div className="p-3 border-b border-slate-800 bg-slate-900/80 text-xs font-bold text-slate-400 flex justify-between">
                                <span>INTERFACE NEURONALE</span>
                                {isThinking && <span className="text-purple-400 animate-pulse">Réflexion...</span>}
                            </div>
                            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {chatMessages.length === 0 && <div className="text-center text-slate-600 mt-20 text-sm italic">En attente d'initialisation...</div>}
                                {chatMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-800 border border-slate-700'}`}>{msg.content}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center">
                                {/* BOUTON MICRO */}
                                <button
                                    onClick={toggleMic}
                                    className={`p-2 rounded-lg transition-all ${isListening ? 'bg-red-900/50 text-red-500 animate-pulse border border-red-500' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}
                                >
                                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                                </button>
                                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-transparent border border-slate-700 rounded-lg px-3 text-sm focus:border-purple-500 outline-none h-10" placeholder={isListening ? "Écoute..." : "Message..."} />
                                <button onClick={handleSendMessage} className="bg-purple-600 text-white px-4 rounded-lg h-10 hover:bg-purple-500">➤</button>
                            </div>
                        </div>
                    </div>

                    {/* COLONNE CENTRE (GLOBE) */}
                    <div className="lg:col-span-1 flex flex-col h-full bg-black/40 rounded-xl border border-slate-800 overflow-hidden relative">
                        <div className="absolute top-2 left-2 z-10 text-xs font-bold text-slate-500 bg-black/50 px-2 rounded">RÉSEAU OMBRE</div>
                        <ShadowGlobe onLocationChange={(city) => addLog(`[NOEUD] ${city} actif`)} />
                    </div>

                    {/* COLONNE DROITE (RADAR & LOGS) */}
                    <div className="lg:col-span-1 flex flex-col gap-6 h-full">
                        {/* RADAR */}
                        <div className="h-1/2 bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-green-400 uppercase"><Radio size={14} /> CANAUX SÉCURISÉS</div>
                                <span className="text-[10px] text-slate-500 bg-slate-800 px-2 rounded-full">{contacts.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                                {contacts.length === 0 ? (
                                    <div className="text-center text-slate-600 text-xs mt-10 italic">Aucun signal.</div>
                                ) : (
                                    contacts.map((contact) => (
                                        <button key={contact.id} onClick={() => handleOpenChat(contact.id)} className="w-full text-left p-3 rounded-lg border bg-slate-800/30 border-slate-800 hover:bg-slate-800 hover:border-slate-600 flex items-center justify-between group">
                                            <div className="overflow-hidden">
                                                <div className="font-bold text-xs text-slate-300 flex items-center gap-2">{contact.id.slice(0, 10)}...</div>
                                            </div>
                                            <MessageCircle size={16} className="text-slate-600 group-hover:text-white" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                        {/* TERMINAL */}
                        <div className="h-1/2 bg-black border border-slate-800 rounded-xl p-3 flex flex-col font-mono text-xs">
                            <div className="text-slate-500 border-b border-slate-800 mb-2 pb-1">LOGS SYSTÈME</div>
                            <div ref={terminalRef} className="flex-1 overflow-y-auto text-green-500/80 space-y-1">{logs.map((l, i) => <div key={i}>{l}</div>)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* BOUTON CORTEX FLOTTANT */}
            <div className="fixed bottom-6 right-6 z-50"><button onClick={openCortex} className="p-4 bg-slate-900 border-2 border-purple-500 rounded-full shadow-lg text-white hover:scale-110 transition-transform"><span className="text-2xl">🧠</span></button></div>

            {/* MODALE CORTEX (Avec fonction DELETE réparée) */}
            {showCortexPanel && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                    <div className="w-full max-w-3xl bg-slate-900 rounded-2xl border border-slate-700 flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-slate-700 flex justify-between"><h2 className="font-bold text-white">🧠 CORTEX</h2><button onClick={() => setShowCortexPanel(false)} className="text-white">✖</button></div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {cortexMemories.length === 0 && <div className="text-slate-500 text-center italic mt-10">Cortex vide.</div>}
                            {cortexMemories.map((m, i) => (
                                <div key={i} className="p-3 bg-slate-800 rounded border border-slate-700 flex justify-between items-center text-white group">
                                    <div className="text-sm truncate max-w-[80%]">{m.content}</div>
                                    {/* BOUTON SUPPRIMER RÉPARÉ */}
                                    <button
                                        onClick={() => handleDeleteMemory(m.id)}
                                        className="text-slate-600 hover:text-red-500 transition-colors p-2"
                                        title="Supprimer ce souvenir"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE MESSAGERIE SECRÈTE */}
            {showMessaging && activeContactId && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="w-full max-w-2xl bg-black border border-green-500/50 rounded-lg shadow-[0_0_50px_rgba(34,197,94,0.2)] flex flex-col h-[600px] font-mono">
                        <div className="p-4 border-b border-green-900 flex justify-between items-center bg-green-900/10">
                            <h2 className="text-green-500 font-bold">CANAL SÉCURISÉ: {activeContactId.slice(0, 8)}...</h2>
                            <button onClick={() => setShowMessaging(false)} className="text-green-700 hover:text-green-500"><X size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                            <div className="text-center text-green-900 mt-10">Initialisation du lien...</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}