'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Radar, Radio, MessageCircle, Send, X } from 'lucide-react';
import ShadowGlobe from '@/components/shadow-globe';
import { useSpeech } from '@/lib/hooks/use-speech';

// --- TYPE DEFINITIONS ---
interface Memory {
    id: string;
    encryptedContent: string;
    createdAt: string;
}

// --- 1. SAS DE CONNEXION ---
const SasConnexion = () => {
    const [inputId, setInputId] = useState('');
    const handleManualLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputId.trim()) window.location.href = `/dashboard?profileId=${inputId}`;
    };
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-black to-black"></div>
            <div className="max-w-md w-full bg-slate-900/80 border border-slate-700 p-8 rounded-2xl relative z-10 backdrop-blur-xl shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center border border-slate-700"><Lock className="w-8 h-8 text-red-500" /></div>
                    <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Identification Requise</h1>
                </div>
                <form onSubmit={handleManualLogin} className="space-y-4">
                    <input type="text" value={inputId} onChange={(e) => setInputId(e.target.value)} placeholder="ex: afredof" className="w-full bg-black/50 border border-slate-600 focus:border-purple-500 rounded-lg px-4 py-3 text-white outline-none font-mono" autoFocus />
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all">RÉTABLIR LA CONNEXION</button>
                </form>
            </div>
        </div>
    );
};

// --- 2. SAFE MISSION CONTROL ---
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

// --- 3. DASHBOARD ---
export default function MissionControl() {
    const searchParams = useSearchParams();
    const profileId = searchParams.get('profileId');

    // Etats
    const [isInitialized, setIsInitialized] = useState(false);
    const [memories, setMemories] = useState<any[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [contacts, setContacts] = useState<any[]>([]); // <--- AJOUTER CECI

    // Chat IA
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'twin', content: string }>>([]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [lastFoundClone, setLastFoundClone] = useState<string | null>(null);

    // MESSAGERIE ENTRE CLONES (NOUVEAU)
    const [activeContactId, setActiveContactId] = useState<string | null>(null);
    const [showMessaging, setShowMessaging] = useState(false);
    const [conversation, setConversation] = useState<any[]>([]);
    const [msgInput, setMsgInput] = useState('');

    // UI Refs
    const chatRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const msgEndRef = useRef<HTMLDivElement>(null);
    const { isListening, transcript, startListening, speak: voiceSpeak } = useSpeech();

    // Neuro-Link & Cortex
    const [neuroInput, setNeuroInput] = useState('');
    const [isPrivateMemory, setIsPrivateMemory] = useState(false);
    const [isSavingMemory, setIsSavingMemory] = useState(false);
    const [showCortexPanel, setShowCortexPanel] = useState(false);
    const [cortexMemories, setCortexMemories] = useState<any[]>([]);
    const [cortexSearch, setCortexSearch] = useState('');

    // Init
    useEffect(() => {
        let mounted = true;
        const initSequence = async () => {
            if (profileId) {
                await new Promise(r => setTimeout(r, 800));
                if (mounted) { setIsInitialized(true); loadMemories(); addLog('[BOOT] Système en ligne.'); }
            }
        };
        initSequence();
        return () => { mounted = false; };
    }, [profileId]);

    // BOUCLE DE SYNC CONTACTS (RADAR)
    useEffect(() => {
        if (!profileId) return;

        const fetchContacts = async () => {
            try {
                const res = await fetch(`/api/contacts?profileId=${profileId}`);
                const data = await res.json();
                if (data.contacts) {
                    setContacts(data.contacts);
                    // Petit effet sonore ou log si un message non lu est détecté
                    const unreadCount = data.contacts.filter((c: any) => c.hasUnread).length;
                    if (unreadCount > 0) {
                        // Optionnel : addLog(`[RADAR] ${unreadCount} conversation(s) active(s).`);
                    }
                }
            } catch (e) { }
        };

        fetchContacts();
        const interval = setInterval(fetchContacts, 4000); // Rafraîchir toutes les 4s
        return () => clearInterval(interval);
    }, [profileId]);

    // Charger la conversation si active
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
        const interval = setInterval(loadHistory, 3000); // Polling chat
        return () => clearInterval(interval);
    }, [profileId, activeContactId, showMessaging]);

    // Scroll Sync
    useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatMessages]);
    useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [logs]);
    useEffect(() => { if (msgEndRef.current) msgEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [conversation]);
    useEffect(() => { if (transcript) setChatInput(transcript); }, [transcript]);

    // --- ACTIONS ---

    const addLog = (msg: string) => { setLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString('fr-FR', { hour12: false })}] ${msg}`]); };
    const speak = (text: string) => { if (voiceSpeak) voiceSpeak(text); };

    const loadMemories = async () => {
        if (!profileId) return;
        try {
            const res = await fetch(`/api/memories?profileId=${profileId}`);
            const data = await res.json();
            if (data.memories) setMemories(data.memories);
        } catch (e) { }
    };

    // --- MESSAGERIE LOGIQUE ---

    const handleOpenChat = async (contactId: string) => {
        // 1. Ouvrir la fenêtre de chat
        setActiveContactId(contactId);
        setShowMessaging(true);
        addLog(`[CONNEXION] Canal sécurisé ouvert vers ${contactId.slice(0, 5)}...`);

        // 2. Nettoyage Visuel Immédiat (Supprime la notif du Radar)
        setNotifications(prev => prev.filter(n => n.fromId !== contactId));

        // 3. Dire au serveur de marquer comme LU (pour ne pas que ça revienne au prochain scan)
        try {
            await fetch('/api/messages/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromId: contactId, toId: profileId })
            });
        } catch (e) {
            console.error("Erreur marquage lu", e);
        }
    };

    const handleSendP2PMessage = async () => {
        if (!msgInput.trim() || !activeContactId) return;
        try {
            const res = await fetch('/api/messages/send', {
                method: 'POST',
                body: JSON.stringify({ fromId: profileId, toId: activeContactId, content: msgInput })
            });
            if (res.ok) {
                // Optimistic update
                setConversation(prev => [...prev, { fromId: profileId, content: msgInput, createdAt: new Date() }]);
                setMsgInput('');
            }
        } catch (e) { alert("Erreur envoi"); }
    };

    // --- FONCTIONS EXISTANTES (Mission, Cortex, etc.) ---
    const handleSendMessage = async () => { /* ... Code Chat IA ... */
        if (!chatInput.trim() || isThinking) return;
        const userMsg = chatInput;
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatInput('');
        setIsThinking(true);
        try {
            const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: userMsg, profileId }) });
            const data = await res.json();
            const reply = data.response || "Silence radio.";
            setChatMessages(prev => [...prev, { role: 'twin', content: reply }]);
            speak(reply);
        } catch (e) { setChatMessages(prev => [...prev, { role: 'twin', content: "Erreur connexion." }]); }
        finally { setIsThinking(false); }
    };

    const handleMission = async () => {
        if (!chatInput.trim()) return;
        const missionQuery = chatInput;
        setChatMessages(prev => [...prev, { role: 'user', content: `🚀 MISSION : ${missionQuery}` }]);
        setChatInput('');
        setIsThinking(true);
        try {
            const res = await fetch('/api/mission', { method: 'POST', body: JSON.stringify({ mission: missionQuery, profileId }) });
            const data = await res.json();
            let aiContent = "";
            if (data.candidates && data.candidates.length > 0) {
                setLastFoundClone(data.candidates[0].cloneId);
                aiContent = `🎯 Trouvé ${data.candidates.length} clone(s) compatible(s)!\nID: ...${data.candidates[0].cloneId.slice(0, 5)}`;
            } else { aiContent = "🕵️‍♂️ Aucun résultat."; }
            setChatMessages(prev => [...prev, { role: 'twin', content: aiContent }]);
        } catch (e) { setChatMessages(prev => [...prev, { role: 'twin', content: "Erreur Mission." }]); }
        finally { setIsThinking(false); }
    };

    const handlePing = async () => {
        if (!lastFoundClone) return;
        try {
            await fetch('/api/ping', { method: 'POST', body: JSON.stringify({ fromId: profileId, toId: lastFoundClone, reason: "Mission Match" }) });
            setChatMessages(prev => [...prev, { role: 'twin', content: "📡 PING ENVOYÉ." }]);
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
            if (data.memories) setCortexMemories(data.memories.map((m: any) => ({ ...m, content: m.content || m.encryptedContent || "N/A" })));
        } catch (e) { }
    };

    const handleDeleteMemory = async (id: string) => {
        if (!confirm("Supprimer?")) return;
        await fetch('/api/memories/delete', { method: 'DELETE', body: JSON.stringify({ id }) });
        setCortexMemories(prev => prev.filter(m => m.id !== id));
        setMemories(prev => prev.filter(m => m.id !== id));
    };

    // --- RENDU ---
    if (!profileId || !isInitialized) {
        if (!profileId) return <SasConnexion />;
        return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-mono"><div className="text-4xl animate-spin">🧬</div><div>SYNCHRONISATION...</div></div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 text-white p-4 md:p-6 font-sans overflow-hidden">

            {/* NEURO-LINK */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-full max-w-2xl z-50 px-4">
                <div className={`relative bg-slate-900/80 backdrop-blur-md border rounded-2xl shadow-2xl ${isSavingMemory ? 'border-purple-500' : 'border-slate-700'}`}>
                    <div className="flex items-center p-2">
                        <button onClick={() => setIsPrivateMemory(!isPrivateMemory)} className={`p-2 rounded-xl text-xs mr-2 border ${isPrivateMemory ? 'bg-red-900/30 text-red-400 border-red-500' : 'bg-green-900/30 text-green-400 border-green-500'}`}>{isPrivateMemory ? '🔒 PRIVÉ' : '🌐 ACTIF'}</button>
                        <input type="text" value={neuroInput} onChange={(e) => setNeuroInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleNeuroSave()} placeholder="Encoder un souvenir..." className="flex-1 bg-transparent border-none text-white focus:ring-0" disabled={isSavingMemory} />
                        <button onClick={handleNeuroSave} disabled={!neuroInput} className="p-2 ml-2">💾</button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto pt-24 h-full flex flex-col">
                {/* Header */}
                <div className="mb-6 flex justify-between items-center border-b border-slate-800 pb-4">
                    <div><h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent font-mono">MISSION CONTROL</h1><p className="text-xs text-slate-500">v2.1.4-COMM • {profileId.slice(0, 8)}...</p></div>
                    <div className="flex gap-4 text-xs font-mono"><div className="flex items-center gap-1 text-green-400">ONLINE</div></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 h-[600px]">
                    {/* GAUCHE : IA */}
                    <div className="lg:col-span-2 flex flex-col gap-6 h-full">
                        <SafeMissionControl count={memories.length} />
                        <div className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
                            <div className="p-3 border-b border-slate-800 bg-slate-900/80 text-xs font-bold text-slate-400">INTERFACE NEURONALE</div>
                            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {chatMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-800 border border-slate-700'}`}>{msg.content}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
                                <button onClick={startListening} className={`p-2 rounded-lg ${isListening ? 'bg-red-500' : 'bg-slate-800'}`}>🎙️</button>
                                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-transparent border border-slate-700 rounded-lg px-3 text-sm" />
                                <button onClick={handleSendMessage} className="bg-purple-600 text-white px-4 rounded-lg">➜</button>
                                <button onClick={handleMission} className="bg-blue-600 text-white px-3 rounded-lg">🚀</button>
                                {lastFoundClone && <button onClick={handlePing} className="bg-green-600 text-white px-3 rounded-lg animate-pulse">📡</button>}
                            </div>
                        </div>
                    </div>

                    {/* CENTRE : Globe */}
                    <div className="lg:col-span-1 flex flex-col h-full bg-black/40 rounded-xl border border-slate-800 overflow-hidden relative">
                        <div className="absolute top-2 left-2 z-10 text-xs font-bold text-slate-500 bg-black/50 px-2 rounded">RÉSEAU OMBRE</div>
                        <ShadowGlobe onLocationChange={(city) => addLog(`[NOEUD] ${city} actif`)} />
                    </div>

                    {/* DROITE : Radar & Terminal */}
                    <div className="lg:col-span-1 flex flex-col gap-6 h-full">
                        {/* RADAR & CONTACTS (STYLE WHATSAPP) */}
                        <div className="h-1/2 bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-green-400 uppercase">
                                    <Radio size={14} /> CANAUX SÉCURISÉS
                                </div>
                                <span className="text-[10px] text-slate-500 bg-slate-800 px-2 rounded-full">
                                    {contacts.length}
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                                {contacts.length === 0 ? (
                                    <div className="text-center text-slate-600 text-xs mt-10 italic">
                                        En attente de signal...
                                    </div>
                                ) : (
                                    contacts.map((contact) => (
                                        <button
                                            key={contact.id}
                                            onClick={() => handleOpenChat(contact.id)}
                                            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-center justify-between group ${contact.hasUnread
                                                ? 'bg-green-900/20 border-green-500/50 hover:bg-green-900/30'
                                                : 'bg-slate-800/30 border-slate-800 hover:bg-slate-800 hover:border-slate-600'
                                                }`}
                                        >
                                            <div className="overflow-hidden">
                                                <div className="font-bold text-xs text-slate-300 flex items-center gap-2">
                                                    {contact.id.slice(0, 10)}...
                                                    {contact.hasUnread && (
                                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></span>
                                                    )}
                                                </div>
                                                <div className={`text-[11px] truncate mt-1 ${contact.hasUnread ? 'text-green-400 font-medium' : 'text-slate-500'}`}>
                                                    {contact.hasUnread ? '📩 ' : ''}
                                                    "{contact.lastMessage}"
                                                </div>
                                            </div>

                                            <div className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MessageCircle size={16} />
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="h-1/2 bg-black border border-slate-800 rounded-xl p-3 flex flex-col font-mono text-xs">
                            <div className="text-slate-500 border-b border-slate-800 mb-2 pb-1">LOGS</div>
                            <div ref={terminalRef} className="flex-1 overflow-y-auto text-green-500/80 space-y-1">{logs.map((l, i) => <div key={i}>{l}</div>)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* BOUTON CORTEX */}
            <div className="fixed bottom-6 right-6 z-50"><button onClick={openCortex} className="p-4 bg-slate-900 border-2 border-purple-500 rounded-full shadow-lg text-white"><span className="text-2xl">🧠</span></button></div>

            {/* MODALE CORTEX */}
            {showCortexPanel && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                    <div className="w-full max-w-3xl bg-slate-900 rounded-2xl border border-slate-700 flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-slate-700 flex justify-between"><h2 className="font-bold text-white">🧠 CORTEX</h2><button onClick={() => setShowCortexPanel(false)} className="text-white">✕</button></div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {cortexMemories.map(m => (<div key={m.id} className="p-3 bg-slate-800 rounded border border-slate-700 flex justify-between text-white"><div className="text-sm">{m.content}</div><button onClick={() => handleDeleteMemory(m.id)}>🗑️</button></div>))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE MESSAGERIE SECRÈTE (NEW) */}
            {showMessaging && activeContactId && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="w-full max-w-2xl bg-black border border-green-500/50 rounded-lg shadow-[0_0_50px_rgba(34,197,94,0.2)] flex flex-col h-[600px] font-mono">
                        {/* Header Messagerie */}
                        <div className="p-4 border-b border-green-900 flex justify-between items-center bg-green-900/10">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                <div>
                                    <h2 className="text-green-500 font-bold text-lg tracking-widest">CANAL SÉCURISÉ</h2>
                                    <p className="text-xs text-green-700">ENCRYPTION: ZK-STARK • CIBLE: ...{activeContactId.slice(0, 8)}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowMessaging(false)} className="text-green-700 hover:text-green-500 transition-colors"><X size={24} /></button>
                        </div>

                        {/* Zone Discussion */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                            {conversation.length === 0 ? (
                                <div className="text-center text-green-900 mt-20">Initiation du lien de données...</div>
                            ) : (
                                conversation.map((msg, i) => {
                                    const isMe = msg.fromId === profileId;
                                    return (
                                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] p-3 rounded-sm border ${isMe ? 'border-green-500 bg-green-900/20 text-green-100 text-right' : 'border-slate-700 bg-slate-900/80 text-slate-300'}`}>
                                                <p className="text-sm">{msg.content}</p>
                                                <p className="text-[10px] opacity-50 mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={msgEndRef} />
                        </div>

                        {/* Input Messagerie */}
                        <div className="p-4 border-t border-green-900 bg-black flex gap-2">
                            <input
                                type="text"
                                value={msgInput}
                                onChange={e => setMsgInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendP2PMessage()}
                                className="flex-1 bg-green-900/10 border border-green-900 rounded p-3 text-green-500 placeholder-green-900 focus:border-green-500 outline-none"
                                placeholder="Transmettre données..."
                                autoFocus
                            />
                            <button onClick={handleSendP2PMessage} className="p-3 bg-green-700 hover:bg-green-600 text-black font-bold rounded flex items-center gap-2">
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}