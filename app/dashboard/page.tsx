'use client';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Network } from 'lucide-react';
import { keyManager } from '@/lib/crypto/key-manager';
import { encrypt, decrypt } from '@/lib/crypto/zk-encryption'; // Restored
import { cryptoManager } from '@/lib/security/crypto';
import ShadowGlobe from '@/components/shadow-globe';
import { useSpeech } from '@/lib/hooks/use-speech'; // Hook vocal

interface Memory {
    id: string;
    encryptedContent: string;
    createdAt: string;
}

interface DecryptedMemory extends Memory {
    content: string;
    type?: 'secret' | 'public';
}

export default function MissionControl() {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const terminalRef = useRef<HTMLDivElement>(null);

    // Scribe state
    const [memories, setMemories] = useState<DecryptedMemory[]>([]);
    const [newMemory, setNewMemory] = useState('');
    const [quickMemory, setQuickMemory] = useState(''); // Nouvel état pour l'input
    const [isSecretMode, setIsSecretMode] = useState(false); // Nouveau Switch
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Synchronization Rate state
    const [connectedSources, setConnectedSources] = useState(0);

    // Tab and Chat state
    const [activeTab, setActiveTab] = useState<'SCRIBE' | 'CHAT'>('SCRIBE');
    const [chatMessages, setChatMessages] = useState<Array<{
        role: 'user' | 'twin';
        content: string;
        timestamp?: string;
    }>>([]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const chatRef = useRef<HTMLDivElement>(null);

    // VOICE MODE HOOK
    const { isListening, transcript, startListening, speak, isSpeaking } = useSpeech();

    // Effet : Quand la reconnaissance vocale écrit du texte, on le met dans l'input
    useEffect(() => {
        if (transcript) {
            setChatInput(transcript);
        }
    }, [transcript]);

    // File upload state
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

    // Terminal state
    const [logs, setLogs] = useState<string[]>([]);

    const [error, setError] = useState('');

    useEffect(() => {
        if (!keyManager.isSessionActive()) {
            router.push('/');
        } else {
            setAuthorized(true);

            const profileId = keyManager.getProfileId();
            if (profileId) {
                localStorage.setItem('twins_last_id', profileId);
                fetchAndSaveProfileName(profileId);
            }

            loadMemories();
            loadConnectedSources();

            // Initialize terminal
            addLog('[SYSTÈME] Réseau Ombre initialisé');
            addLog('[SYSTÈME] Chiffrement quantique : ACTIF');
            addLog('[SYSTÈME] Protocole Zero-Knowledge : EN LIGNE');

            // Random flavor logs
            const logInterval = setInterval(() => {
                const flavorLogs = [
                    '[ANALYSE] Vecteurs sémantiques en cours...',
                    '[CRYPTO] Handshake ZK confirmé',
                    '[RÉSEAU] Scan fréquences locales',
                    '[IA] Patterns neuronaux détectés',
                    '[SÉCURITÉ] Tunnel chiffré stable',
                ];
                const randomLog = flavorLogs[Math.floor(Math.random() * flavorLogs.length)];
                addLog(randomLog);
            }, 7000);

            return () => clearInterval(logInterval);
        }
    }, [router]);

    // Auto-scroll terminal
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    const fetchAndSaveProfileName = async (profileId: string) => {
        try {
            const response = await fetch(`/api/profile/${profileId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.name) {
                    localStorage.setItem('twins_last_name', data.name);
                }
            }
        } catch (err) {
            console.error('Failed to fetch profile name:', err);
        }
    };

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString('fr-FR', { hour12: false });
        setLogs(prev => [...prev.slice(-15), `[${timestamp}] ${message}`]);
    };

    const handleLocationChange = (city: string) => {
        addLog(`[SYSTÈME] Connexion nœud local : ${city.toUpperCase()}`);
        setTimeout(() => {
            addLog(`[RÉSEAU] ${city} : ${Math.floor(Math.random() * 100 + 50)} nœuds actifs`);
        }, 1200);
    };

    const loadMemories = async () => {
        setLoading(true);
        setError('');
        try {
            const profileId = keyManager.getProfileId();
            if (!profileId) return;

            const response = await fetch(`/api/memory?profileId=${profileId}`);

            if (!response.ok) {
                console.warn("⚠️ API Error fetching memories");
                setError('Échec du chargement des mémoires');
                return;
            }

            const data = await response.json();

            // --- CRITICAL FIX: Ensure data is an Array before mapping ---
            if (!Array.isArray(data)) {
                console.warn("⚠️ API returned non-array data:", data);
                setMemories([]); // Fallback to empty list
                return;
            }

            const masterKey = keyManager.getMasterKey();

            // Hybrid Decryption Logic (Safe) - handles both encrypted (Scribe) and plaintext (file uploads)
            const decryptedPromises = data.map(async (memory: any) => {
                try {
                    // Attempt to decrypt (for Scribe entries with encryptedContent)
                    const content = await decrypt(memory.encryptedContent || memory.content, masterKey);
                    return { ...memory, content, type: 'secret' };
                } catch (e) {
                    // Fallback to plain text (for File Uploads stored in 'content' field)
                    return { ...memory, content: memory.content || memory.encryptedContent, type: 'public' };
                }
            });

            const safeMemories = await Promise.all(decryptedPromises);
            setMemories(safeMemories);
        } catch (err: any) {
            setError(err.message);
            console.error('❌ Erreur critique loadMemories:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadConnectedSources = async () => {
        try {
            const response = await fetch('/api/sources');
            if (response.ok) {
                const data = await response.json();
                const connected = Array.isArray(data) ? data.filter((s: any) => s.isConnected).length : 0;
                setConnectedSources(connected);
            }
        } catch (err) {
            console.error('Error loading sources:', err);
        }
    };

    // Calculate Synchronization Rate
    const calculateSyncRate = () => {
        const memoryScore = memories.length * 0.5; // Each memory = 0.5%
        const sourceScore = connectedSources * 5; // Each source = 5%
        const total = Math.min(memoryScore + sourceScore, 100); // Cap at 100%
        return Math.round(total);
    };

    const getSyncLevel = (percentage: number) => {
        if (percentage === 100) return 'Singularité Atteinte';
        if (percentage >= 81) return 'Alter Ego';
        if (percentage >= 51) return 'Doublure Opérationnelle';
        if (percentage >= 21) return 'Apprenti Cognitif';
        return 'Stade Embryonnaire';
    };

    const syncRate = calculateSyncRate();
    const syncLevel = getSyncLevel(syncRate);


    const handleSaveMemory = async () => {
        if (!newMemory.trim()) {
            setError('Veuillez entrer une mémoire');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const profileId = keyManager.getProfileId();
            const masterKey = keyManager.getMasterKey();

            const encryptedContent = await encrypt(newMemory, masterKey);
            const encryptedMetadata = await encrypt(
                JSON.stringify({ timestamp: new Date().toISOString() }),
                masterKey
            );

            const response = await fetch('/api/memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profileId,
                    encryptedContent,
                    encryptedMetadata,
                    type: 'TEXT',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Échec de sauvegarde');
            }

            setNewMemory('');
            await loadMemories();
            addLog('[MÉMOIRE] Nouvelle entrée chiffrée et stockée');
        } catch (err: any) {
            setError(err.message);
            console.error('Error saving memory:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleSaveMemory();
        }
    };

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [chatMessages]);

    // Chat handler
    const handleSendMessage = async () => {
        if (!chatInput.trim() || isThinking) return;

        const userMessage = { role: 'user' as const, content: chatInput, timestamp: new Date().toISOString() };
        setChatMessages(prev => [...prev, userMessage]);
        const currentInput = chatInput;
        setChatInput('');
        setIsThinking(true);

        try {
            const profileId = keyManager.getProfileId();
            // On prépare le nouveau message utilisateur
            const newUserMsg = { role: 'user' as const, content: chatInput, timestamp: new Date().toISOString() };
            // On met à jour l'état local tout de suite (pour l'affichage) mais on garde une ref propre pour l'API
            const newHistory = [...chatMessages, newUserMsg];

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newHistory, // <--- On envoie le tableau complet !
                    profileId
                })
            });

            if (!response.ok) {
                throw new Error('Erreur de communication');
            }

            const data = await response.json();
            console.log("📦 [FRONTEND REÇOIT] :", data); // <--- REGARDEZ LA CONSOLE F12

            if (!response.ok) {
                throw new Error(data.error || "Erreur serveur");
            }

            // ON FORCE L'AFFICHAGE DU CONTENU EXACT
            const twinResponse = data.response || "⚠️ Le cerveau a renvoyé une réponse vide.";

            setChatMessages((prev) => [
                ...prev,
                { role: 'twin', content: twinResponse }
            ]);

            // 🗣️ LE JUMEAU PARLE ICI
            speak(twinResponse);

            addLog('[DIALOGUE] Réponse du jumeau générée');
        } catch (err: any) {
            console.error('Chat error:', err);
            setChatMessages(prev => [...prev, {
                role: 'twin',
                content: 'Erreur de connexion au jumeau. Veuillez réessayer.',
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const constructTwinResponse = (data: any) => {
        const { memories } = data;

        if (!memories || memories.length === 0) {
            return "Je n'ai trouvé aucun souvenir pertinent sur ce sujet dans ma mémoire. Pouvez-vous m'en dire plus ou me partager de nouveaux souvenirs ?";
        }

        let response = `J'ai analysé vos souvenirs. J'ai trouvé ${memories.length} élément(s) pertinent(s) :\n\n`;

        memories.slice(0, 3).forEach((mem: any, idx: number) => {
            const content = mem.content || '[Contenu chiffré]';
            response += `${idx + 1}. ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}\n\n`;
        });

        if (memories.length > 3) {
            response += `... et ${memories.length - 3} autre(s) souvenir(s).`;
        }

        return response;
    };

    const handleChatKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleQuickAdd = async () => {
        if (!quickMemory.trim()) return;

        try {
            const profileId = keyManager.getProfileId();

            if (isSecretMode) {
                // --- MODE SCRIBE (SECRET) ---
                const encrypted = await cryptoManager.encrypt(quickMemory);

                await fetch('/api/memory/scribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ encryptedContent: encrypted, profileId }),
                });
                alert("🔒 Secret chiffré et verrouillé dans le coffre.");

            } else {
                // --- MODE INCEPTION (IA) ---
                const res = await fetch('/api/memory/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: quickMemory, profileId }),
                });
                if (!res.ok) throw new Error("Erreur sauvegarde");
                alert("🧠 Souvenir ancré dans le cerveau de l'IA.");
            }

            setQuickMemory('');
            // Pas besoin de recharger loadMemories() ici si on ne les affiche pas tout de suite

        } catch (error) {
            console.error(error);
            alert("Erreur de sauvegarde.");
        }
    };

    const handleFileUpload = async (file: File) => {
        // 1. On vérifie qu'un fichier est sélectionné
        if (!file) return;

        setUploadingFile(true);
        setUploadSuccess(null);
        setError('');

        const profileId = keyManager.getProfileId();
        // 2. On prépare le colis pour le serveur
        const formData = new FormData();
        formData.append('file', file);
        formData.append('profileId', profileId || '');

        try {
            // 3. ON ENVOIE AU SERVEUR (C'est lui qui va lire le PDF)
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Erreur inconnue");
            }

            // 4. Succès !
            setUploadSuccess(`Succès : ${data.message || 'Fichier mémorisé !'}`);

            // Recharger les souvenirs
            setTimeout(() => {
                loadMemories();
                setUploadSuccess(null);
            }, 2000);

        } catch (err: any) {
            console.error(err);
            setError("Erreur upload: " + err.message);
        } finally {
            setUploadingFile(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Voulez-vous vraiment effacer ce souvenir ?")) return;

        try {
            const res = await fetch(`/api/memory/delete?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Erreur suppression");

            // Mise à jour immédiate de la liste (optimiste)
            setMemories(prev => prev.filter(m => m.id !== id));

        } catch (error) {
            console.error(error);
            alert("Impossible de supprimer.");
        }
    };

    if (!authorized) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 text-white p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 border-2 border-purple-500/30 bg-black/50 backdrop-blur p-4 md:p-6 rounded-lg">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent font-mono">
                                ╔═══ MISSION CONTROL ═══╗
                            </h1>
                            <p className="text-purple-300 text-xs md:text-sm">
                                🔐 Architecture Zero-Knowledge • Protocole Agent Autonome
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link
                                href="/connections"
                                className="flex items-center gap-2 px-4 py-2 border border-purple-500 text-purple-400 rounded-lg hover:bg-purple-500/10 transition-all font-mono text-sm"
                            >
                                <Network className="w-4 h-4" />
                                <span className="hidden md:inline">GÉRER LES FLUX</span>
                            </Link>
                            <div className="text-right font-mono">
                                <div className="text-xs text-purple-400">STATUT</div>
                                <div className="text-lg text-green-400 font-bold animate-pulse">● ACTIF</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 border border-red-500 bg-red-900/20 p-4 rounded-lg">
                        <p className="text-red-300">⚠ {error}</p>
                    </div>
                )}

                {/* Synchronization Rate Widget */}
                <div className="mb-6 border-2 border-pink-500/40 bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-purple-900/30 backdrop-blur rounded-xl p-6 md:p-8 shadow-2xl shadow-pink-500/10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Left: Percentage Circle */}
                        <div className="flex-shrink-0">
                            <div className="relative w-32 h-32 md:w-40 md:h-40">
                                {/* Background Circle */}
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="50%"
                                        cy="50%"
                                        r="45%"
                                        fill="none"
                                        stroke="rgba(139, 92, 246, 0.2)"
                                        strokeWidth="8"
                                    />
                                    {/* Progress Circle */}
                                    <circle
                                        cx="50%"
                                        cy="50%"
                                        r="45%"
                                        fill="none"
                                        stroke="url(#syncGradient)"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
                                        strokeDashoffset={2 * Math.PI * 45 * (1 - syncRate / 100)}
                                        className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]"
                                    />
                                    <defs>
                                        <linearGradient id="syncGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#a855f7" />
                                            <stop offset="50%" stopColor="#ec4899" />
                                            <stop offset="100%" stopColor="#06b6d4" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                {/* Percentage Text */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                                        {syncRate}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                                TAUX DE SYNCHRONISATION
                            </h2>
                            <div className="mb-4">
                                <span className="inline-block px-4 py-2 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-pink-500/50 rounded-full text-pink-300 font-bold text-sm md:text-base font-mono">
                                    {syncLevel}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-4">
                                <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden border border-purple-500/30">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(236,72,153,0.8)]"
                                        style={{ width: `${syncRate}%` }}
                                    />
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-green-400">🧠</span>
                                    <span className="text-purple-300">{memories.length} Mémoires</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-blue-400">🔗</span>
                                    <span className="text-purple-300">{connectedSources} Flux Connectés</span>
                                </div>
                            </div>

                            {/* Motivational Text */}
                            <p className="text-sm text-pink-300/80 italic">
                                {syncRate < 100
                                    ? "⚡ Données insuffisantes pour l'autonomie totale. Nourrissez le modèle."
                                    : "✨ Singularité atteinte. Votre jumeau est pleinement opérationnel."
                                }
                            </p>
                        </div>
                    </div>
                </div>


                {/* Main Grid: 2 Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LEFT: Tabbed Interface (Journal / Chat) */}
                    <div className="space-y-6">
                        {/* Tab Switcher */}
                        <div className="flex gap-2 border-2 border-purple-500/30 bg-black/50 backdrop-blur rounded-lg p-2">
                            <button
                                onClick={() => setActiveTab('SCRIBE')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold font-mono text-sm transition-all ${activeTab === 'SCRIBE'
                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                                    : 'bg-transparent border border-green-500/30 text-green-400 hover:bg-green-500/10'
                                    }`}
                            >
                                ✍️ JOURNAL
                            </button>
                            <button
                                onClick={() => setActiveTab('CHAT')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold font-mono text-sm transition-all ${activeTab === 'CHAT'
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                                    : 'bg-transparent border border-purple-500/30 text-purple-400 hover:bg-purple-500/10'
                                    }`}
                            >
                                💬 DIALOGUE
                            </button>
                        </div>

                        {/* SCRIBE TAB */}
                        {activeTab === 'SCRIBE' && (
                            <>
                                <div className="border-2 border-green-500/30 bg-black/50 backdrop-blur rounded-lg p-4 md:p-6">
                                    <div className="flex items-center gap-2 mb-4 border-b border-green-500/30 pb-3">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        <h2 className="text-lg md:text-xl font-bold text-green-400 font-mono">
                                            🧠 JOURNAL NEURONAL
                                        </h2>
                                    </div>

                                    {/* Memory Input */}
                                    <div className="space-y-4">
                                        {/* ZONE INCEPTION MODIFIÉE */}
                                        <div className={`p-4 rounded-xl shadow-sm border transition-colors ${isSecretMode ? 'bg-slate-900 border-red-900/50' : 'bg-white/5 border-green-500/20'
                                            }`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className={`font-semibold font-mono text-xs ${isSecretMode ? 'text-red-400' : 'text-green-300'
                                                    }`}>
                                                    {isSecretMode ? '🔒 LE SCRIBE (COFFRE-FORT)' : '⚡ INCEPTION (MÉMOIRE IA)'}
                                                </h3>

                                                {/* LE SWITCH */}
                                                <button
                                                    onClick={() => setIsSecretMode(!isSecretMode)}
                                                    className={`text-[10px] px-2 py-1 rounded-full font-bold transition-all font-mono border ${isSecretMode ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-green-500/20 text-green-400 border-green-500/50'
                                                        }`}
                                                >
                                                    {isSecretMode ? 'MODE SECRET ACTIF' : 'MODE PUBLIC'}
                                                </button>
                                            </div>

                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={quickMemory}
                                                    onChange={(e) => setQuickMemory(e.target.value)}
                                                    placeholder={isSecretMode ? "Mot de passe, Secret..." : "Ex: Le code du wifi est Zx99..."}
                                                    className={`flex-1 p-2 border rounded-lg text-sm outline-none transition-all font-mono ${isSecretMode
                                                        ? 'bg-slate-950/80 border-red-500/30 text-red-100 placeholder-red-500/30 focus:ring-1 focus:ring-red-500'
                                                        : 'bg-slate-900/80 border-green-500/30 text-green-100 placeholder-green-500/30 focus:ring-1 focus:ring-green-500'
                                                        }`}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                                                />
                                                <button
                                                    onClick={handleQuickAdd}
                                                    className={`px-4 py-2 rounded-lg text-white transition-colors font-bold ${isSecretMode ? 'bg-red-600/20 text-red-400 border border-red-500/50 hover:bg-red-600/40' : 'bg-green-600/20 text-green-400 border border-green-500/50 hover:bg-green-600/40'
                                                        }`}
                                                >
                                                    {isSecretMode ? '🔒' : '+'}
                                                </button>
                                            </div>
                                        </div>
                                        {/* --------------------------- */}

                                        <div>
                                            <label className="text-xs text-green-400/70 font-mono mb-2 block">
                                                NOUVELLE MÉMOIRE CHIFFRÉE
                                            </label>
                                            <textarea
                                                value={newMemory}
                                                onChange={(e) => setNewMemory(e.target.value)}
                                                onKeyDown={handleKeyPress}
                                                className="w-full bg-slate-900/50 border border-green-500/30 rounded-lg p-3 md:p-4 text-green-100 placeholder-green-500/30 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm min-h-[150px] resize-y"
                                                placeholder="[ENTRÉE SÉCURISÉE]&#10;Ctrl+Entrée pour sauvegarder..."
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-green-400/50 font-mono">
                                                🔒 CHIFFREMENT CLIENT
                                            </div>
                                            <button
                                                onClick={handleSaveMemory}
                                                disabled={saving || !newMemory.trim()}
                                                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-4 md:px-6 py-2 md:py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-green-500/20 font-mono text-sm"
                                            >
                                                {saving ? '[CHIFFREMENT...]' : '[MÉMORISER]'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* File Upload Section */}
                                <div className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-900/20 via-pink-900/10 to-purple-900/20 backdrop-blur rounded-lg p-4 md:p-6">
                                    <div className="text-xs text-purple-400/70 font-mono mb-3 border-b border-purple-500/30 pb-2">
                                        OU IMPORTER UN FICHIER
                                    </div>

                                    <div
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const file = e.dataTransfer.files[0];
                                            if (file) handleFileUpload(file);
                                        }}
                                        onDragOver={(e) => e.preventDefault()}
                                        className="border-2 border-dashed border-purple-500/50 rounded-lg p-6 text-center hover:border-purple-500 transition-colors cursor-pointer bg-purple-900/10 hover:bg-purple-900/20"
                                    >
                                        {uploadingFile ? (
                                            <div className="text-purple-400 font-mono text-sm">
                                                <div className="animate-pulse mb-2 flex items-center justify-center gap-2">
                                                    <span className="inline-block w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                    <span className="inline-block w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                                    <span className="inline-block w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                                    <span className="ml-2">Analyse du cortex...</span>
                                                </div>
                                                <div className="text-xs text-purple-400/50">Vectorisation en cours</div>
                                            </div>
                                        ) : uploadSuccess ? (
                                            <div className="text-green-400 font-mono text-sm animate-pulse">
                                                ✓ {uploadSuccess}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-purple-400 font-mono text-sm mb-2">
                                                    📄 Glissez vos documents ici
                                                </div>
                                                <div className="text-xs text-purple-400/50 mb-3">
                                                    TXT, MD, Logs, PDF
                                                </div>
                                                <input
                                                    type="file"
                                                    accept=".txt,.md,.log,.pdf"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleFileUpload(file);
                                                    }}
                                                    className="hidden"
                                                    id="file-upload"
                                                />
                                                <label
                                                    htmlFor="file-upload"
                                                    className="inline-block px-4 py-2 bg-purple-600/30 border border-purple-500/50 rounded text-purple-300 text-xs font-mono hover:bg-purple-600/50 cursor-pointer transition-all"
                                                >
                                                    ou cliquez pour parcourir
                                                </label>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Bloc Journal Neuronal (Lien vers la page dédiée) */}
                                <div className="bg-white/5 p-6 rounded-xl shadow-sm border border-green-500/20 text-center hover:border-green-500/50 transition-colors">
                                    <div className="mb-4">
                                        <span className="text-4xl filter drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">🧠</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-green-100 mb-2 font-mono">GESTION DU CORTEX</h3>
                                    <p className="text-green-400/70 text-sm mb-6 font-mono">
                                        Consultez, modifiez et nettoyez les souvenirs de votre Jumeau pour affiner sa personnalité.
                                    </p>

                                    <Link
                                        href={`/memories?profileId=${keyManager.getProfileId()}`}
                                        className="inline-flex items-center px-6 py-3 bg-green-600/20 text-green-300 border border-green-500/50 rounded-lg hover:bg-green-600/40 transition-all font-bold font-mono shadow-[0_0_15px_rgba(74,222,128,0.1)] hover:shadow-[0_0_20px_rgba(74,222,128,0.3)]"
                                    >
                                        ACCÉDER AU CORTEX MANAGER →
                                    </Link>
                                </div>
                            </>
                        )}

                        {/* CHAT TAB */}
                        {activeTab === 'CHAT' && (
                            <div className="border-2 border-purple-500/30 bg-black/50 backdrop-blur rounded-lg p-4 md:p-6">
                                <div className="flex items-center gap-2 mb-4 border-b border-purple-500/30 pb-3">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                                    <h2 className="text-lg md:text-xl font-bold text-purple-400 font-mono">
                                        💬 DIALOGUE AVEC LE JUMEAU
                                    </h2>
                                </div>

                                {/* Chat Messages */}
                                <div
                                    ref={chatRef}
                                    className="h-[500px] overflow-y-auto space-y-4 mb-4 p-2"
                                >
                                    {chatMessages.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-center">
                                            <div className="text-purple-400/50 font-mono text-sm">
                                                <p className="mb-2">🤖 Jumeau en attente...</p>
                                                <p className="text-xs">Posez-moi une question sur vos souvenirs</p>
                                            </div>
                                        </div>
                                    ) : (
                                        chatMessages.map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                                        : 'bg-slate-800 text-green-100 border border-green-500/30'
                                                        }`}
                                                >
                                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                    {msg.timestamp && (
                                                        <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-purple-200' : 'text-green-400/50'} font-mono`}>
                                                            {new Date(msg.timestamp).toLocaleTimeString('fr-FR')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    {/* Thinking Indicator */}
                                    {isThinking && (
                                        <div className="flex justify-start">
                                            <div className="bg-slate-800 border border-purple-500/30 rounded-lg p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex gap-1">
                                                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                    </div>
                                                    <span className="text-purple-300 text-sm font-mono">Le jumeau réfléchit...</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Chat Input */}
                                <div className="flex gap-2">
                                    {/* BOUTON MICRO */}
                                    <button
                                        onClick={isListening ? undefined : startListening}
                                        className={`p-3 rounded-lg transition-all ${isListening
                                            ? 'bg-red-500 text-white animate-pulse'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                        title="Parler"
                                    >
                                        {isListening ? '👂' : '🎙️'}
                                    </button>

                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyPress={handleChatKeyPress}
                                        disabled={isThinking}
                                        className="flex-1 bg-slate-900/50 border border-purple-500/30 rounded-lg p-3 text-purple-100 placeholder-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm disabled:opacity-50"
                                        placeholder="Parlez à votre jumeau..."
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={isThinking || !chatInput.trim()}
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 font-mono text-sm"
                                    >
                                        {isThinking ? '...' : 'ENVOYER'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Shadow Network */}
                    <div className="space-y-6">
                        {/* 3D Globe */}
                        <div className="border-2 border-purple-500/30 bg-black/50 backdrop-blur rounded-lg p-4 md:p-6">
                            <div className="flex items-center gap-2 mb-4 border-b border-purple-500/30 pb-3">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                                <h2 className="text-lg md:text-xl font-bold text-purple-400 font-mono">
                                    🌐 RÉSEAU OMBRE
                                </h2>
                            </div>

                            <ShadowGlobe onLocationChange={handleLocationChange} />
                        </div>

                        {/* Live Terminal */}
                        <div className="border-2 border-cyan-500/30 bg-black/50 backdrop-blur rounded-lg p-4 md:p-6">
                            <div className="flex items-center gap-2 mb-4 border-b border-cyan-500/30 pb-3">
                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                                <h2 className="text-lg md:text-xl font-bold text-cyan-400 font-mono">
                                    💻 TERMINAL LIVE
                                </h2>
                            </div>

                            <div
                                ref={terminalRef}
                                className="bg-black/90 border border-cyan-500/20 rounded p-3 md:p-4 h-[300px] overflow-y-auto font-mono text-xs space-y-1"
                            >
                                {logs.map((log, idx) => (
                                    <div key={idx} className="text-green-400">
                                        {log}
                                    </div>
                                ))}
                                <div className="text-green-400 animate-pulse inline-block">▊</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-xs text-purple-400/50 font-mono">
                    DIGITAL TWIN v2.0 • VISUALISATION COBE • SURVEILLANCE RÉSEAU TEMPS RÉEL
                </div>
            </div>
        </div>
    );
}
