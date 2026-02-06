'use client';
import { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

// ✅ COLLEZ CECI À LA PLACE (Nouveau Mission Control Sécurisé)
const SafeMissionControl = ({ count }: { count: number }) => {
    // Calcul simulé du taux de synchro basé sur le nombre de souvenirs
    const syncRate = Math.min(100, Math.floor(count * 2.5));

    return (
        <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Systèmes Vitaux
            </h3>

            <div className="space-y-6">
                {/* JAUGE SYNCHRONISATION */}
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-blue-400 font-mono">Taux de Synchro</span>
                        <span className="text-white font-bold">{syncRate}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-1000"
                            style={{ width: `${syncRate}%` }}
                        ></div>
                    </div>
                </div>

                {/* JAUGE MÉMOIRE */}
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-purple-400 font-mono">Fragments Mémoire</span>
                        <span className="text-white font-bold">{count}</span>
                    </div>
                    <div className="grid grid-cols-10 gap-1">
                        {[...Array(10)].map((_, i) => (
                            <div
                                key={i}
                                className={`h-1 rounded-full transition-all delay-[${i * 50}ms] ${i < (count / 10) ? 'bg-purple-500 shadow-[0_0_5px_#a855f7]' : 'bg-slate-800'
                                    }`}
                            ></div>
                        ))}
                    </div>
                </div>

                <div className="p-3 bg-blue-900/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 font-mono">
                    STATUS: ONLINE<br />
                    CONNEXION: STABLE
                </div>
            </div>
        </div>
    );
};


// On renomme l'original pour ne pas le perdre (mais il ne sera plus appelé)
export default function MissionControl() {
    const searchParams = useSearchParams();
    const profileId = searchParams.get('profileId');
    const router = useRouter();

    // Ajoutez cet état pour bloquer l'affichage tant que tout n'est pas prêt
    const [isInitialized, setIsInitialized] = useState(false);

    // --- EFFET D'INITIALISATION SÉCURISÉE ---
    useEffect(() => {
        if (profileId) {
            // On simule un micro-délai pour être sûr que le KeyManager a le temps de respirer
            // (Dans une vraie app, on appellerait KeyManager.init(profileId) ici)
            const timer = setTimeout(() => {
                setIsInitialized(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [profileId]);




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
    const [activeTab, setActiveTab] = useState<'SCRIBE' | 'CHAT'>('CHAT');
    const [chatMessages, setChatMessages] = useState<Array<{
        role: 'user' | 'twin';
        content: string;
        timestamp?: string;
    }>>([]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const chatRef = useRef<HTMLDivElement>(null);

    // VOICE MODE HOOK
    const { isListening, transcript, startListening, isSpeaking } = useSpeech();

    const speak = (text: string) => {
        // 🔇 MODE SILENCIEUX ACTIVÉ
        return;
    };

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

    // Mission PING state
    const [lastFoundClone, setLastFoundClone] = useState<string | null>(null);

    // Notifications state
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifPanel, setShowNotifPanel] = useState(false);

    // Contacts state
    const [contacts, setContacts] = useState<any[]>([]);

    const [showContactsPanel, setShowContactsPanel] = useState(false);
    const [hasNewContact, setHasNewContact] = useState(false); // <--- NOUVEL ÉTAT pour le point rouge

    // Messaging state
    const [activeConversation, setActiveConversation] = useState<any>(null);
    const [conversationMessages, setConversationMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");

    const [error, setError] = useState('');

    // --- ÉTATS NEURO-LINK ---
    const [neuroInput, setNeuroInput] = useState('');
    const [isPrivateMemory, setIsPrivateMemory] = useState(false);
    const [isSavingMemory, setIsSavingMemory] = useState(false);

    // --- ÉTATS POUR LE CORTEX MANAGER RAPIDE ---
    const [showCortexPanel, setShowCortexPanel] = useState(false);
    const [cortexMemories, setCortexMemories] = useState<any[]>([]);
    const [cortexSearch, setCortexSearch] = useState('');

    // --- FONCTION : OUVRIR ET CHARGER LE CORTEX ---
    // --- FONCTION : OUVRIR ET CHARGER LE CORTEX ---
    const openCortex = async () => {
        setShowCortexPanel(true);
        const id = keyManager.getProfileId();
        if (!id) return;

        try {
            // Utilisation de /api/memory (singulier) qui existe déjà
            const res = await fetch(`/api/memory?profileId=${id}`);

            if (!res.ok) {
                console.error("Erreur API:", res.status, res.statusText);
                return;
            }

            const data = await res.json();
            // Gestion de la réponse (Array direct ou objet {memories: []})
            if (Array.isArray(data)) {
                setCortexMemories(data);
            } else if (data.memories) {
                setCortexMemories(data.memories);
            }
        } catch (e) {
            console.error("Erreur chargement cortex", e);
        }
    };

    // --- FONCTION : SUPPRIMER UN SOUVENIR ---
    // --- FONCTION : SUPPRIMER UN SOUVENIR ---
    const handleDeleteMemory = async (id: string) => {
        if (!confirm("⚠️ Irréversible : Voulez-vous vraiment effacer ce souvenir ?")) return;

        try {
            const res = await fetch('/api/memories/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (!res.ok) {
                const text = await res.text();
                // Protection contre les pages HTML d'erreur (404/500)
                alert(`Erreur API (${res.status}) : Vérifiez /api/memories/delete`);
                console.error("Réponse serveur:", text);
                return;
            }

            const data = await res.json();
            if (data.success) {
                // Mise à jour optimiste de l'UI
                setCortexMemories(prev => prev.filter(m => m.id !== id));
            } else {
                alert("Erreur: " + data.error);
            }
        } catch (e) {
            console.error(e);
            alert("Erreur technique lors de la suppression.");
        }
    };

    // Filtrage pour la recherche dans le tableau
    const filteredCortex = cortexMemories.filter(m =>
        m.content?.toLowerCase().includes(cortexSearch.toLowerCase())
    );

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
            fetchNotifications(profileId); // Charger les notifications

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

    // Fetch notifications
    const fetchNotifications = async (pid?: string) => {
        const profileId = pid || keyManager.getProfileId();
        if (!profileId) return;

        try {
            const res = await fetch(`/api/notifications?profileId=${profileId}`);
            const data = await res.json();
            if (data.notifications) {
                setNotifications(data.notifications);
                // Si on a des notifs, le jumeau peut nous prévenir vocalement
                if (data.count > 0) {
                    speak(`Vous avez ${data.count} nouvelles demandes de contact.`);
                }
            }
        } catch (e) {
            console.error("Erreur notifs", e);
        }
    };

    // LE RADAR : On lance la vérification toutes les 5 secondes
    useEffect(() => {
        const profileId = keyManager.getProfileId();
        if (profileId) {
            fetchContacts(profileId); // Chargement initial

            const interval = setInterval(() => {
                fetchContacts(profileId); // Vérification périodique
            }, 5000); // 5000 ms = 5 secondes

            return () => clearInterval(interval); // Nettoyage quand on quitte la page
        }
    }, []);

    const fetchContacts = async (pid: string) => {
        try {
            const res = await fetch(`/api/contacts?profileId=${pid}`);
            const data = await res.json();

            if (data.contacts) {
                setContacts(prevContacts => {
                    // Si on a plus de contacts qu'avant, c'est qu'on a été accepté !
                    if (data.contacts.length > prevContacts.length && prevContacts.length > 0) {
                        setHasNewContact(true);
                        // On peut même faire parler le clone
                        // speak("Nouvelle connexion établie !"); 
                    }
                    return data.contacts;
                });
            }
        } catch (e) {
            console.error(e);
        }
    };

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

    // 🚀 MISSION HANDLER - Recherche dans le réseau des clones
    const handleMission = async () => {
        if (!chatInput.trim()) return;

        // On affiche la question de l'utilisateur
        const userMsg = { role: 'user' as const, content: `🕵️‍♂️ MISSION : ${chatInput}` };
        setChatMessages(prev => [...prev, userMsg]);
        setIsThinking(true);

        try {
            const profileId = keyManager.getProfileId();
            // Appel à la VRAIE API de recherche
            const res = await fetch('/api/mission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mission: chatInput,
                    profileId: profileId
                })
            });

            const data = await res.json();

            let aiContent = "";

            if (data.candidates && data.candidates.length > 0) {
                const bestMatch = data.candidates[0];
                setLastFoundClone(bestMatch.cloneId); // ON SAUVEGARDE L'ID

                aiContent = `### 🎯 J'ai trouvé ${data.candidates.length} profil(s) compatible(s) !\n\n`;
                data.candidates.forEach((c: any) => {
                    // On affiche le VRAI ID (anonymisé) et le VRAI Score
                    aiContent += `* **Clone ID:** \`...${c.cloneId.slice(-6)}\`\n`;
                    aiContent += `* **Match:** **${c.score}%**\n`;
                    aiContent += `* **Analyse:** ${c.reason}\n\n`;
                });
                aiContent += "\n*Voulez-vous initier un PING sécurisé ?*";
            } else {
                aiContent = "🕵️‍♂️ Je n'ai trouvé aucun clone compatible dans le réseau pour l'instant.";
            }

            setChatMessages(prev => [...prev, { role: 'twin', content: aiContent }]);
            speak("Mission terminée. J'ai analysé le réseau."); // Feedback vocal

        } catch (err) {
            console.error(err);
            setChatMessages(prev => [...prev, { role: 'twin', content: "⚠️ Erreur lors de la mission." }]);
        } finally {
            setIsThinking(false);
            setChatInput('');
        }
    };

    // 📡 PING HANDLER - Envoyer un signal au dernier clone trouvé
    const handlePing = async () => {
        if (!lastFoundClone) {
            alert("Faites d'abord une mission pour trouver quelqu'un !");
            return;
        }

        const confirmPing = window.confirm(`Envoyer un PING officiel au clone ...${lastFoundClone.slice(-6)} ?`);
        if (!confirmPing) return;

        try {
            const profileId = keyManager.getProfileId();
            const res = await fetch('/api/ping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromId: profileId,
                    toId: lastFoundClone,
                    reason: chatInput || "Mission Match"
                })
            });

            const data = await res.json();
            if (data.success) {
                setChatMessages(prev => [...prev, { role: 'twin', content: "📡 **PING ENVOYÉ !** Le protocole de mise en relation est activé." }]);
                speak("Ping envoyé. J'attends sa réponse.");
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            console.error(e);
            alert("Erreur lors de l'envoi du Ping");
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

    const handleRespond = async (commId: string, status: 'ACCEPTED' | 'REJECTED') => {
        try {
            // 1. On sauvegarde les infos du contact AVANT de le supprimer de la liste
            const targetContact = notifications.find(n => n.id === commId);

            // 2. Appel à l'API
            const res = await fetch('/api/communications/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ communicationId: commId, status })
            });

            if (!res.ok) throw new Error("Erreur serveur");

            // 3. Mise à jour visuelle (On retire la notif)
            setNotifications(prev => prev.filter(n => n.id !== commId));

            // 4. SI ACCEPTÉ -> ON OUVRE LE TCHAT DIRECTEMENT
            if (status === 'ACCEPTED' && targetContact) {
                setShowNotifPanel(false);   // On ferme les notifs
                setShowContactsPanel(true); // On ouvre le panneau principal
                openChat(targetContact);    // On lance la conversation
            }

        } catch (e) {
            console.error(e);
            alert("Erreur lors de la mise à jour");
        }
    };

    // A. Ouvrir une conversation
    const openChat = async (contact: any) => {
        setActiveConversation(contact);
        // On charge l'historique
        const res = await fetch(`/api/messages?commId=${contact.id}`);
        const data = await res.json();
        if (data.messages) setConversationMessages(data.messages);
    };

    // B. Envoyer un message
    const sendDirectMessage = async () => {
        if (!newMessage.trim() || !activeConversation) return;

        const tempMsg = newMessage;
        setNewMessage(""); // On vide l'input tout de suite (UX)

        const profileId = keyManager.getProfileId();

        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    commId: activeConversation.id,
                    senderId: profileId,
                    content: tempMsg
                })
            });

            const data = await res.json();
            if (data.success) {
                // On ajoute le message à la liste locale pour l'affichage immédiat
                setConversationMessages(prev => [...prev, data.message]);
            }
        } catch (e) {
            alert("Erreur d'envoi");
        }
    };

    // --- FONCTION : NEURO-LINK SAVE ---
    const handleNeuroSave = async () => {
        if (!neuroInput.trim()) return;
        setIsSavingMemory(true);

        const profileId = keyManager.getProfileId();
        if (!profileId) {
            setIsSavingMemory(false);
            return;
        }

        try {
            const res = await fetch('/api/memories/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: neuroInput,
                    type: isPrivateMemory ? 'PRIVATE' : 'PUBLIC',
                    profileId: profileId
                })
            });

            if (res.ok) {
                setNeuroInput('');
                // Optionnel : Petit feedback sonore ou visuel
                speak("Souvenir encodé.");
                // Actualisation du Cortex si le tableau est visible
                if (showCortexPanel) openCortex();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSavingMemory(false);
        }
    };

    // 🛑 GARDIEN COMBINÉ (Pas d'ID ou Pas Prêt)
    if (!profileId || !isInitialized) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">

                {/* Fond décoratif */}
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                {/* Si on a l'ID mais qu'on initialise... */}
                {profileId ? (
                    <div className="text-center animate-pulse">
                        <div className="text-4xl mb-4">🧬</div>
                        <h2 className="font-mono text-blue-400 text-xl">Synchronisation Neuronale...</h2>
                        <p className="text-slate-500 text-xs mt-2">Initialisation du Cortex</p>
                    </div>
                ) : (
                    /* Si on n'a PAS l'ID (Le formulaire de connexion) */
                    <div className="z-10 bg-slate-900/80 p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full backdrop-blur-md">
                        <div className="text-center mb-8">
                            <div className="text-6xl mb-4">🔒</div>
                            <h1 className="text-2xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                                ACCÈS NEURONAL
                            </h1>
                            <p className="text-slate-400 text-sm mt-2">Identifiant requis.</p>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const id = formData.get('idInput') as string;
                                if (id) router.push(`/dashboard?profileId=${id}`);
                            }}
                            className="space-y-4"
                        >
                            <input
                                name="idInput"
                                type="text"
                                placeholder="Ex: cml_..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none font-mono text-sm"
                                autoFocus
                            />
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition">
                                CONNEXION
                            </button>
                        </form>
                    </div>
                )}
            </div>
        );
    }

    if (!authorized) return null;

    return (
        <div key={profileId + "_mission"} className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 text-white p-4 md:p-6">

            {/* --- NEURO-LINK : BARRE D'ENTRÉE CENTRALE --- */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-full max-w-2xl z-50 px-4">
                <div className={`
          relative bg-slate-900/80 backdrop-blur-md border rounded-2xl shadow-2xl transition-all duration-300
          ${isSavingMemory ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'border-slate-700 hover:border-slate-500'}
        `}>

                    <div className="flex items-center p-2">

                        {/* SWITCH PRIVÉ / PUBLIC */}
                        <button
                            onClick={() => setIsPrivateMemory(!isPrivateMemory)}
                            className={`
                flex-shrink-0 p-2 rounded-xl transition-all duration-300 font-bold text-xs mr-2 border
                ${isPrivateMemory
                                    ? 'bg-red-900/30 text-red-400 border-red-500/50 hover:bg-red-900/50'
                                    : 'bg-green-900/30 text-green-400 border-green-500/50 hover:bg-green-900/50'}
              `}
                            title={isPrivateMemory ? "Mode Intime (Crypté)" : "Mode Réseau (Partageable)"}
                        >
                            {isPrivateMemory ? '🔒 PRIVÉ' : '🌐 ACTIF'}
                        </button>

                        {/* CHAMP DE SAISIE */}
                        <input
                            type="text"
                            value={neuroInput}
                            onChange={(e) => setNeuroInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleNeuroSave()}
                            placeholder="Apprenez-moi quelque chose sur vous..."
                            className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:outline-none focus:ring-0 text-sm md:text-base font-medium"
                            disabled={isSavingMemory}
                        />

                        {/* BOUTON ENVOYER */}
                        <button
                            onClick={handleNeuroSave}
                            disabled={!neuroInput || isSavingMemory}
                            className={`
                p-2 rounded-xl transition-all duration-300 ml-2
                ${neuroInput
                                    ? 'bg-purple-600 text-white shadow-lg cursor-pointer hover:scale-105'
                                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'}
              `}
                        >
                            {isSavingMemory ? (
                                <span className="animate-spin block">🌀</span>
                            ) : (
                                <span>💾</span>
                            )}
                        </button>
                    </div>

                    {/* BARRE DE PROGRESSION (Décoratif) */}
                    <div className="h-0.5 w-full bg-slate-800 rounded-b-2xl overflow-hidden">
                        <div className={`h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-1000 ${isSavingMemory ? 'w-full' : 'w-0'}`}></div>
                    </div>

                </div>
            </div>

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
                            {/* --- BOUTON CONTACTS (Juste au dessus de la cloche) --- */}
                            <div className="fixed bottom-24 left-6 z-[9999]">
                                <button
                                    onClick={() => {
                                        setShowContactsPanel(true);
                                        setHasNewContact(false); // On éteint l'alerte quand on clique
                                    }}
                                    className="relative p-4 rounded-full shadow-lg transition transform hover:scale-110"
                                    style={{
                                        backgroundColor: '#0f172a',
                                        border: hasNewContact ? '2px solid #22c55e' : '2px solid #3b82f6', /* Vert si nouveau, Bleu sinon */
                                        color: 'white'
                                    }}
                                    title="Mes Connexions"
                                >
                                    <span style={{ fontSize: '1.5rem' }}>👥</span>

                                    {/* LE POINT ROUGE CLIGNOTANT (Radar) */}
                                    {hasNewContact && (
                                        <span className="absolute top-0 right-0 flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* --- MODALE UNIFIÉE (CONTACTS & TCHAT) --- */}
                            {showContactsPanel && (
                                <div
                                    className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' }}
                                >
                                    <div className="w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-blue-500 h-[500px] flex flex-col animate-in fade-in zoom-in duration-300">

                                        {/* --- CAS 1 : MODE TCHAT --- */}
                                        {activeConversation ? (
                                            <>
                                                {/* Header Tchat */}
                                                <div className="p-3 bg-slate-800 border-b border-blue-500 flex justify-between items-center text-white">
                                                    <button onClick={() => setActiveConversation(null)} className="text-sm text-blue-400 hover:text-white transition">
                                                        ← Retour
                                                    </button>
                                                    <span className="font-mono font-bold text-blue-200">
                                                        ID: {activeConversation.to_clone_id === keyManager.getProfileId()
                                                            ? activeConversation.from_clone_id.slice(0, 6)
                                                            : activeConversation.to_clone_id.slice(0, 6)}...
                                                    </span>
                                                    <button onClick={() => setShowContactsPanel(false)} className="text-slate-500 hover:text-white transition">✕</button>
                                                </div>

                                                {/* Zone des Messages */}
                                                <div className="flex-1 overflow-y-auto p-4 bg-slate-900 space-y-3">
                                                    {conversationMessages.length === 0 && (
                                                        <div className="text-center text-slate-600 text-xs mt-10">Début de la conversation cryptée.</div>
                                                    )}
                                                    {conversationMessages.map((msg) => {
                                                        const isMe = msg.sender_id === keyManager.getProfileId();
                                                        return (
                                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${isMe
                                                                    ? 'bg-blue-600 text-white rounded-br-none'
                                                                    : 'bg-slate-700 text-slate-200 rounded-bl-none'
                                                                    }`}>
                                                                    {msg.content}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Input Tchat */}
                                                <div className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newMessage}
                                                        onChange={(e) => setNewMessage(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && sendDirectMessage()}
                                                        placeholder="Message sécurisé..."
                                                        className="flex-1 bg-slate-900 text-white border border-slate-600 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                                                    />
                                                    <button
                                                        onClick={sendDirectMessage}
                                                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center transition hover:scale-105"
                                                    >
                                                        ➤
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            /* --- CAS 2 : LISTE DES CONTACTS --- */
                                            <>
                                                <div className="p-4 bg-blue-900/50 border-b border-blue-500 flex justify-between items-center text-white font-bold">
                                                    <h3>👥 Mes Connexions Actives</h3>
                                                    <button onClick={() => setShowContactsPanel(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
                                                </div>

                                                <div className="flex-1 overflow-y-auto p-2">
                                                    {contacts.length === 0 ? (
                                                        <div className="p-8 text-center text-slate-500 italic">
                                                            Aucune connexion active. <br />Lancez une mission ! 🚀
                                                        </div>
                                                    ) : (
                                                        contacts.map((contact) => {
                                                            // On détermine qui est l'autre (si je suis sender, l'autre est receiver)
                                                            const myId = keyManager.getProfileId();
                                                            const otherId = contact.from_clone_id === myId ? contact.to_clone_id : contact.from_clone_id;

                                                            return (
                                                                <div key={contact.id} className="mb-2 bg-slate-800 rounded-lg p-3 border border-slate-700 hover:bg-slate-700 cursor-pointer flex justify-between items-center transition">
                                                                    <div>
                                                                        <div className="text-sm text-blue-300 font-mono">
                                                                            ...{otherId.slice(-8)}
                                                                        </div>
                                                                        <div className="text-xs text-slate-400 truncate w-32">
                                                                            Sujet : {contact.content}
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => openChat(contact)}
                                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-full"
                                                                    >
                                                                        💬 Discuter
                                                                    </button>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* --- 1. LE BOUTON CLOCHE (Reste en bas à gauche) --- */}
                            <div className="fixed bottom-6 left-6 z-[9999]">
                                <button
                                    onClick={() => setShowNotifPanel(true)}
                                    className="relative p-4 rounded-full shadow-lg transition transform hover:scale-110 hover:rotate-12"
                                    style={{
                                        backgroundColor: '#1e293b',
                                        border: '2px solid #a855f7',
                                        color: 'white'
                                    }}
                                >
                                    <span style={{ fontSize: '1.5rem' }}>🔔</span>
                                    {notifications.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-pulse border-2 border-slate-900">
                                            {notifications.length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* --- 2. LA MODALE (OVERLAY) --- */}
                            {showNotifPanel && (
                                <div
                                    className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' }}
                                    onClick={(e) => {
                                        if (e.target === e.currentTarget) setShowNotifPanel(false);
                                    }}
                                >
                                    {/* LA BOÎTE DE RÉCEPTION CENTRALE */}
                                    <div
                                        className="w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300"
                                        style={{ border: '1px solid #a855f7' }}
                                    >
                                        {/* En-tête */}
                                        <div className="p-4 bg-purple-900/50 border-b border-purple-500 flex justify-between items-center">
                                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                                📨 Boîte de Réception
                                                <span className="text-xs bg-purple-600 px-2 py-0.5 rounded-full">{notifications.length}</span>
                                            </h3>
                                            <button
                                                onClick={() => setShowNotifPanel(false)}
                                                className="text-slate-400 hover:text-white transition text-xl font-bold px-2"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        {/* Liste des messages */}
                                        <div className="max-h-[60vh] overflow-y-auto p-2">
                                            {notifications.length === 0 ? (
                                                <div className="p-8 text-center text-slate-500 italic">
                                                    Aucun signal entrant pour le moment.
                                                </div>
                                            ) : (
                                                notifications.map((notif) => (
                                                    <div key={notif.id} className="mb-3 bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-purple-500/50 transition">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-xs text-purple-400 font-bold uppercase tracking-wider bg-purple-900/30 px-2 py-1 rounded">
                                                                📡 Signal PING
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">
                                                                {new Date(notif.created_at).toLocaleTimeString()}
                                                            </span>
                                                        </div>

                                                        <p className="text-white mb-3 font-medium text-lg leading-relaxed">
                                                            "{notif.content}"
                                                        </p>

                                                        <div className="text-xs text-slate-400 mb-4 flex items-center gap-2">
                                                            Identifiant source :
                                                            <code className="bg-black/50 px-2 py-1 rounded text-purple-300 font-mono">
                                                                {notif.from_clone_id}
                                                            </code>
                                                        </div>

                                                        {/* BOUTONS D'ACTION */}
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <button
                                                                onClick={() => handleRespond(notif.id, 'ACCEPTED')}
                                                                className="py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center justify-center gap-2"
                                                            >
                                                                ✅ ACCEPTER
                                                            </button>
                                                            <button
                                                                onClick={() => handleRespond(notif.id, 'REJECTED')}
                                                                className="py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg transition"
                                                            >
                                                                🗑️ IGNORER
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
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
                {/* <div key={profileId + "_sync"} className="mb-6 border-2 border-pink-500/40 bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-purple-900/30 backdrop-blur rounded-xl p-6 md:p-8 shadow-2xl shadow-pink-500/10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        
                        <div className="flex-shrink-0">
                            <div className="relative w-32 h-32 md:w-40 md:h-40">
                                
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="50%"
                                        cy="50%"
                                        r="45%"
                                        fill="none"
                                        stroke="rgba(139, 92, 246, 0.2)"
                                        strokeWidth="8"
                                    />
                                    
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
                                
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                                        {syncRate}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                                TAUX DE SYNCHRONISATION
                            </h2>
                            <div className="mb-4">
                                <span className="inline-block px-4 py-2 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-pink-500/50 rounded-full text-pink-300 font-bold text-sm md:text-base font-mono">
                                    {syncLevel}
                                </span>
                            </div>

                            
                            <div className="mb-4">
                                <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden border border-purple-500/30">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(236,72,153,0.8)]"
                                        style={{ width: `${syncRate}%` }}
                                    />
                                </div>
                            </div>

                            
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

                            
                            <p className="text-sm text-pink-300/80 italic">
                                {syncRate < 100
                                    ? "⚡ Données insuffisantes pour l'autonomie totale. Nourrissez le modèle."
                                    : "✨ Singularité atteinte. Votre jumeau est pleinement opérationnel."
                                }
                            </p>
                        </div>
                    </div>
                </div> */}


                {/* Main Grid: 2 Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LEFT: Tabbed Interface (Journal / Chat) */}
                    <div className="space-y-6">

                        {/* ✅ LE NOUVEAU MODULE SÉCURISÉ */}
                        {/* On lui passe le nombre de souvenirs (cortexMemories.length) pour qu'il bouge ! */}
                        <SafeMissionControl count={memories.length} />

                        {/* Tab Switcher */}
                        <div className="flex gap-2 border-2 border-purple-500/30 bg-black/50 backdrop-blur rounded-lg p-2">
                            <Link
                                href={`/dashboard/journal?profileId=${keyManager.getProfileId()}`}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold font-mono text-sm transition-all bg-transparent border border-green-500/30 text-green-400 hover:bg-green-500/10"
                            >
                                ✍️ JOURNAL
                            </Link>
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
                                        href={`/dashboard/cortex?profileId=${keyManager.getProfileId()}`}
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
                                    {/* BOUTON MISSION */}
                                    <button
                                        onClick={handleMission}
                                        disabled={isThinking || !chatInput.trim()}
                                        className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-lg"
                                        title="Lancer une Mission (Recherche Réseau)"
                                    >
                                        🚀
                                    </button>
                                    {/* BOUTON PING (n'apparaît que si on a trouvé quelqu'un) */}
                                    {lastFoundClone && (
                                        <button
                                            onClick={handlePing}
                                            className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 animate-bounce shadow-lg"
                                            title="Envoyer un Ping au dernier profil trouvé"
                                        >
                                            📡
                                        </button>
                                    )}
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


                    {/* Footer */}
                    <div className="mt-6 text-center text-xs text-purple-400/50 font-mono">
                        DIGITAL TWIN v2.0 • VISUALISATION COBE • SURVEILLANCE RÉSEAU TEMPS RÉEL
                    </div>
                </div>
            </div>

            {/* --- 3. BOUTON CORTEX MANAGER RAPIDE (Accès direct) --- */}
            <div className="fixed bottom-44 left-6 z-[9999]">
                <button
                    onClick={openCortex}
                    className="relative p-4 rounded-full shadow-lg transition transform hover:scale-110 group"
                    style={{
                        backgroundColor: '#0f172a',
                        border: '2px solid #a855f7',
                        color: 'white'
                    }}
                    title="Gérer la Mémoire (Cortex)"
                >
                    <span className="text-2xl group-hover:animate-pulse">🧠</span>
                    {/* Badge compteur */}
                    <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-purple-400">
                        ADM
                    </span>
                </button>
            </div>

            {/* --- MODALE CORTEX MANAGER (PLEIN ÉCRAN) --- */}
            {showCortexPanel && (
                <div
                    className="fixed inset-0 z-[100000] flex items-center justify-center p-4 animate-in fade-in duration-300"
                    style={{ backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(5px)' }}
                >
                    <div className="w-full max-w-4xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-purple-500 flex flex-col max-h-[90vh]">

                        {/* EN-TÊTE */}
                        <div className="p-4 bg-purple-900/50 border-b border-purple-500 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2 font-mono">
                                    ⚙️ Cortex Manager <span className="text-xs bg-purple-600 px-2 rounded-full">{cortexMemories.length}</span>
                                </h2>
                                <p className="text-xs text-purple-200 font-mono">ADMINISTRATION DIRECTE DE LA BASE VECTORIELLE</p>
                            </div>
                            <button
                                onClick={() => setShowCortexPanel(false)}
                                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition"
                            >
                                Fermer ✕
                            </button>
                        </div>

                        {/* BARRE DE RECHERCHE */}
                        <div className="p-4 bg-slate-800 border-b border-slate-700">
                            <input
                                type="text"
                                placeholder="🔍 Rechercher un fragment de mémoire à supprimer..."
                                value={cortexSearch}
                                onChange={(e) => setCortexSearch(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none font-mono text-sm"
                            />
                        </div>

                        {/* TABLEAU DES SOUVENIRS */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="text-xs uppercase bg-slate-950 text-slate-500 sticky top-0 font-mono">
                                    <tr>
                                        <th className="px-4 py-3 rounded-tl-lg">Type</th>
                                        <th className="px-4 py-3">Contenu</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3 text-right rounded-tr-lg">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {filteredCortex.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-slate-500 italic">Aucune donnée trouvée.</td>
                                        </tr>
                                    ) : (
                                        filteredCortex.map((mem) => (
                                            <tr key={mem.id} className="hover:bg-slate-800/50 transition">
                                                <td className="px-4 py-3">
                                                    {mem.metadata?.type === 'PRIVATE' ? (
                                                        <span className="text-red-400 border border-red-900 bg-red-900/20 px-2 py-0.5 rounded text-xs font-mono">🔒 PRIVÉ</span>
                                                    ) : (
                                                        <span className="text-green-400 border border-green-900 bg-green-900/20 px-2 py-0.5 rounded text-xs font-mono">🌐 ACTIF</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-200 font-medium max-w-md truncate">
                                                    {mem.content}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs">
                                                    {new Date(mem.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => handleDeleteMemory(mem.id)}
                                                        className="text-slate-500 hover:text-red-500 hover:bg-red-900/20 p-2 rounded transition"
                                                        title="Supprimer définitivement"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
