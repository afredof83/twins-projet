'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Radar, Loader2, BrainCircuit, X, ShieldAlert, ShieldX, Radio, Send, Upload, ChevronRight, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Components
import KnowledgeIngester from '@/components/cortex/KnowledgeIngester';
import { NeuralLink } from '@/components/NeuralLink';
import Scanner from '@/components/dashboard/Scanner';
import TacticalGlobe from '@/components/Globe';
import MatchOverlay from '@/components/dashboard/MatchOverlay';
import DeepAuditReport from '@/components/dashboard/DeepAuditReport';
import StrategicListOverlay from '@/components/dashboard/StrategicListOverlay';
import SecureChat from '@/components/SecureChat';
import { generateTacticalAudit } from '@/app/actions/generate-audit';
import { scanGlobalNetwork } from '@/app/actions/scan-global-network';

// --- LOGIQUE METIER (INCHANGÉE) ---
const calculateSynergy = (target: any, memories: any[]) => {
    let score = 45;
    if (target.bio && target.bio.length > 20) score += 15;
    if (memories.length > 0) score += 10;
    if (memories.some(m => m.type === 'knowledge')) score += 15;
    score += Math.floor(Math.random() * 15) - 5;
    score = Math.min(98, Math.max(12, score));
    const opportunities = [];
    const fullText = (target.bio + " " + memories.map(m => m.content).join(" ")).toLowerCase();
    if (fullText.includes("recherche") || fullText.includes("besoin")) opportunities.push("Demande active.");
    if (fullText.includes("expert") || fullText.includes("senior")) opportunities.push("Expertise technique.");
    if (opportunities.length === 0) opportunities.push("Exploration requise.");
    return { score, opportunities };
};

const mockDeepAudit = {
    identity: {
        name: "Cible Alpha",
        role: "Full Stack Architect",
        clearance: "LEVEL 4",
        lastActive: "14min ago",
    },
    scores: {
        match: 89,
        reliability: 94,
        influence: 72,
    },
    psyche: [
        { trait: "Openness", value: 90, label: "Visionary" },
        { trait: "Conscientiousness", value: 85, label: "Disciplined" },
        { trait: "Neuroticism", value: 12, label: "Stable" },
    ],
    network: [
        "Connecté au Cluster 'React Core'",
        "Accès confirmé : 3 investisseurs",
        "Pont potentiel vers 'Silicon Valley Node'",
    ],
    risks: [
        "Divergence politique mineure (2%)",
        "Localisation instable (Nomade)",
    ]
};

export default function MissionControl() {
    const router = useRouter();
    const [supabase] = useState(() => createClient());
    const [profileId, setProfileId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [memories, setMemories] = useState<any[]>([]);
    const [logs, setLogs] = useState<string[]>([]);

    // New Tactical States
    const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'LOCKED' | 'AUDIT' | 'LIST'>('IDLE');
    const [matchData, setMatchData] = useState<any>(null);
    const [strategicReport, setStrategicReport] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // États UI
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);
    const [channels, setChannels] = useState<any[]>([]);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [showCortexPanel, setShowCortexPanel] = useState(false);
    const [showBlockPanel, setShowBlockPanel] = useState(false);

    // États scan 2 phases
    const [basicResult, setBasicResult] = useState<any>(null);
    const [deepResult, setDeepResult] = useState<any>(null);

    // États Ingestion
    const [quickThought, setQuickThought] = useState("");
    const [isDragging, setIsDragging] = useState(false);

    const [unreadIds, setUnreadIds] = useState<string[]>([]);
    const [blockedIds, setBlockedIds] = useState<string[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);

    const addLog = (message: string) => setLogs(prev => [`> ${new Date().toLocaleTimeString().slice(0, 5)} ${message}`, ...prev].slice(0, 10));

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/'); return; }
            setProfileId(user.id);
            setIsInitialized(true);
            fetchChannels();
            fetchBlockList(user.id);
            loadMemories(user.id);
            fetchAccessRequests(user.id);
        };
        init();
    }, []);

    const fetchAccessRequests = async (id: string) => {
        const { data } = await supabase
            .from('AccessRequest')
            .select('*')
            .eq('provider_id', id)
            .eq('status', 'pending');
        if (data) setIncomingRequests(data);
    };

    // -------------------------------------------------------------
    // 1. ÉCOUTEUR GLOBAL : Nouveaux Canaux (Channel)
    // -------------------------------------------------------------
    useEffect(() => {
        if (!profileId) return;

        let isMounted = true;
        let channelRadar: any = null;

        const initDelay = setTimeout(() => {
            if (!isMounted) return;

            channelRadar = supabase.channel('radar_channels_v4')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Channel' }, () => {
                    fetchChannels();
                })
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'Channel' }, () => {
                    fetchChannels();
                    setIsChatOpen(false);
                })
                .subscribe();
        }, 300);

        return () => {
            isMounted = false;
            clearTimeout(initDelay);
            if (channelRadar) supabase.removeChannel(channelRadar);
        };
    }, [profileId]);

    // -------------------------------------------------------------
    // 1b. ÉCOUTEUR GLOBAL : Demandes de Liaison (AccessRequest)
    // -------------------------------------------------------------
    useEffect(() => {
        if (!profileId) return;

        const requestRadar = supabase.channel('radar_requests')
            .on(
                'postgres_changes',
                // ðŸŸ¢ SUPPRESSION DU FILTRE SERVEUR QUI CAUSAIT LE "MISMATCH"
                { event: 'INSERT', schema: 'public', table: 'AccessRequest' },
                (payload: any) => {
                    const req = payload.new;
                    // ðŸŸ¢ FILTRAGE CÔTÉ CLIENT avec la bonne colonne 'provider_id'
                    if (req.provider_id === profileId) {
                        console.log("âš¡ Nouvelle demande de liaison entrante !");
                        fetchAccessRequests(profileId);
                    }
                }
            )
            .on(
                'postgres_changes',
                // ðŸŸ¢ SUPPRESSION DU FILTRE SERVEUR ÉGALEMENT POUR LE DELETE
                { event: 'DELETE', schema: 'public', table: 'AccessRequest' },
                () => {
                    // Refresh la liste quand une demande est supprimée (ex: annulée, refusée)
                    fetchAccessRequests(profileId);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(requestRadar); };
    }, [profileId]);


    // -------------------------------------------------------------
    // 2. ÉCOUTEUR GLOBAL : Messages non lus (La pastille rouge)
    // -------------------------------------------------------------
    useEffect(() => {
        if (!profileId) return;
        const supabase = createClient();

        const radar = supabase.channel('global_radar')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Message' }, (payload: any) => {
                const newMsg = payload.new;
                // Si le message est pour moi (pas de moi)
                if (newMsg.sender_id !== profileId) {
                    setUnreadIds(prev => {
                        // Si on n'est pas déjà dans ce chat, on ajoute à la liste des non-lus
                        if (activeChannelId !== newMsg.communication_id) {
                            return [...new Set([...prev, newMsg.communication_id])];
                        }
                        return prev;
                    });
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(radar); };
    }, [profileId, activeChannelId]); // Très important d'avoir activeChannelId ici

    const fetchChannels = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: chans } = await supabase
            .from('Channel')
            .select('*')
            .or(`member_one_id.eq.${session.user.id},member_two_id.eq.${session.user.id}`)
            .order('last_message_at', { ascending: false });

        setChannels(chans || []);
    };

    const fetchBlockList = async (pid: string) => {
        const { data } = await supabase.from('BlockList').select('blockedId').eq('blockerId', pid);
        if (data) setBlockedIds(data.map((b: { blockedId: string }) => b.blockedId));
    };

    const loadMemories = async (pid: string) => {
        const res = await fetch(`/api/memories?profileId=${pid}`);
        const data = await res.json();
        if (data.memories) setMemories(data.memories);
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) await handleFileUpload(e.dataTransfer.files[0]);
    };

    const handleFileUpload = async (file: File) => {
        if (!profileId) return;
        addLog(`ANALYSE: ${file.name}`);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('profileId', profileId);
        try {
            const res = await fetch('/api/sensors/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                addLog(`SUCCÈS: Données ingérées.`);
                loadMemories(profileId);

                // ðŸŸ¢ NOUVEAU : On réveille le Gardien silencieusement en arrière-plan !
                // On ne met pas de "await" devant le fetch, pour ne pas geler l'écran de l'utilisateur.
                console.log("ðŸ¦‡ Envoi du signal au Gardien...");
                fetch('/api/guardian', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        profileId: profileId,
                        newMemoryContent: `Nouveau fichier analysé : ${file.name}. Ce document a été ajouté à sa base de données.`
                    })
                }).catch(err => console.error("Erreur du Gardien :", err));
            }
            else { addLog(`ERREUR: Échec lecture.`); }
        } catch (err) { addLog(`CRITIQUE: Erreur upload.`); }
    };

    const handleQuickThoughtSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!quickThought.trim() || !profileId) return;

        // ✅ Filtre anti-corruption : suppression des null bytes
        const cleanThought = quickThought.replace(/\0/g, '').replace(/\u0000/g, '').trim();
        setQuickThought('');
        addLog('MEMOIRE: Archivage...');

        // Récupération du passeport session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { addLog('CRITIQUE: Session expirée.'); return; }

        try {
            const res = await fetch('/api/memories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    content: cleanThought,
                    profileId: session.user.id,
                    type: 'thought',
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            addLog('SUCCÈS: Pensée synchronisée dans le Cortex.');
            loadMemories(profileId);
        } catch (err: any) {
            addLog(`CRITIQUE: ${err.message || 'Échec de transmission.'}`);
        }
    };
    const triggerManualScan = async () => {
        if (!profileId) return;
        setStatus('SCANNING');
        setBasicResult(null);
        setDeepResult(null);
        setMatchData(null);
        setStrategicReport(null);
        addLog('RADAR: Scan de surface initié...');

        try {
            const report = await scanGlobalNetwork(profileId, 'basic');
            console.log('ðŸ“¡ BASIC SCAN:', report);
            setBasicResult(report);
            setStatus('LIST');
            addLog(`RADAR: Analyse de surface terminée â€” statut ${report.globalStatus}.`);
        } catch (e) {
            console.error(e);
            setStatus('IDLE');
            addLog('ERREUR: Scan de surface échoué.');
        }
    };

    // â”€â”€ PHASE 2 : Audit profond (opportunités complètes) â”€â”€
    const triggerDeepAudit = async () => {
        if (!profileId) return;
        setStatus('SCANNING');
        setDeepResult(null);
        addLog('CORTEX: Extraction profonde en cours...');

        try {
            const report = await scanGlobalNetwork(profileId, 'deep');
            console.log('🔥 DEEP AUDIT:', report);
            setDeepResult(report);
            setStrategicReport(report);
            setStatus('LIST');
            addLog(`CONTACT: ${report.opportunities?.length ?? 0} vecteur(s) identifié(s).`);
        } catch (e) {
            console.error(e);
            // On revient au résultat basic si on en avait un
            setStatus('LIST');
            addLog('ERREUR: Audit profond échoué.');
        }
    };

    // â”€â”€ CONTACT : Initier une demande de liaison après audit profond â”€â”€
    const handleContactTarget = async () => {
        // ðŸ” VÉRIFICATION NÂ°1 : Est-ce qu'on a bien l'ID de l'autre Agent IA ?
        console.log("ðŸ” DONNÉES DE L'AUDIT :", deepResult);

        const targetId = deepResult?.targetId || deepResult?.id || deepResult?.profile_id;

        console.log("🎯 ID DE LA CIBLE À CONTACTER :", targetId);

        if (!targetId) {
            alert("[ERREUR CRITIQUE] Impossible d'engager : l'ID de la cible est introuvable. Le radar n'a pas transmis les coordonnées.");
            return;
        }

        if (!profileId) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { addLog('[CRITIQUE] Session expirée.'); return; }

        addLog('LIAISON: Envoi de la demande de contact...');

        try {
            const res = await fetch('/api/network/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    targetId,
                    senderClassification: deepResult?.targetClassification ?? 'entité inconnue',
                }),
            });
            const data = await res.json();
            if (data.success) {
                addLog('SUCCÈS: Demande de contact transmise. En attente de réponse.');
                setStatus('IDLE'); setBasicResult(null); setDeepResult(null);
            } else {
                addLog(`[ERREUR] ${data.error || 'Demande échouée.'}`);
            }
        } catch (err: any) {
            addLog(`[CRITIQUE] Échec de connexion : ${err.message}`);
        }
    };

    // â”€â”€ Réponse aux demandes de liaison (accepter / refuser / bloquer) â”€â”€
    const handleResponse = async (req: any, action: 'accept' | 'refuse' | 'block') => {
        console.log("ðŸ–±ï¸ [DEBUG CLICK] handleResponse déclenché pour:", req.id, "Action:", action);
        // TRAP : Si cette ligne s'affiche au chargement sans clic, c'est le bug !

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        try {
            const res = await fetch('/api/network/respond', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ requestId: req.id, requesterId: req.requester_id, action }),
            });
            const data = await res.json();
            if (data.success) {
                setIncomingRequests(prev => prev.filter(r => r.id !== req.id));
                if (action === 'accept') addLog('LIAISON: Canal sécurisé établi.');
                else if (action === 'block') addLog('SÉCURITÉ: Entité bloquée.');
                else addLog('LIAISON: Requête refusée.');
            }
        } catch (err: any) {
            addLog(`[CRITIQUE] Réponse échouée : ${err.message}`);
        }
    };

    const handleSelectOpportunity = async (opp: any) => {
        if (!profileId) return;
        setIsAnalyzing(true);
        addLog(`CORTEX: Analyse tactique de ${opp.targetName}...`);

        try {
            const aiAudit = await generateTacticalAudit(opp.targetId, profileId);
            setMatchData({
                ...aiAudit,
                targetId: opp.targetId,
                name: opp.targetName,
                identity: { ...aiAudit.identity, name: opp.targetName }
            });
            setStatus('AUDIT');
        } catch (e) {
            addLog("ERREUR: Analyse détaillée échouée.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAction = async (action: 'LINK' | 'BLOCK' | 'CANCEL') => {
        if (!matchData) return;

        if (action === 'LINK') {
            await supabase.from('Channel').insert({ member_one_id: profileId, member_two_id: matchData.targetId, topic: "LIAISON SÉCURISÉE", last_message_at: new Date().toISOString(), initiatorId: profileId });
            addLog("LIAISON: Établie.");
        } else if (action === 'BLOCK') {
            await supabase.from('BlockList').insert({ blockerId: profileId, blockedId: matchData.targetId });
            setBlockedIds(prev => [...prev, matchData.targetId]);
            addLog("SÉCURITÉ: Cible bannie.");
        }

        setStatus('IDLE');
        setMatchData(null);
    };
    const toggleChannelChat = (id: string) => { setActiveChannelId(id); setIsChatOpen(true); setUnreadIds(prev => prev.filter(uid => uid !== id)); };

    const handleDeleteChannel = async (channelId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Empêche d'ouvrir le chat quand on clique sur supprimer

        if (!confirm("CONFIRMATION REQUISE : Rompre définitivement cette liaison sécurisée et purger l'historique ?")) return;

        // 1. Mise à jour optimiste de l'interface (immédiat)
        setChannels(prev => prev.filter(c => c.id !== channelId));

        try {
            // 2. PURGE : On supprime d'abord tous les messages liés à ce canal
            const { error: msgError } = await supabase
                .from('Message') // Attention à la majuscule/minuscule selon votre base !
                .delete()
                .eq('communication_id', channelId);

            if (msgError) throw msgError;

            // 3. DESTRUCTION : Maintenant on peut détruire le canal
            const { error: channelError } = await supabase
                .from('Channel')
                .delete()
                .eq('id', channelId);

            if (channelError) throw channelError;

            addLog(`TERMINATION: Liaison ${channelId.slice(0, 4)} rompue et purgée.`);

        } catch (error: any) {
            console.error("Erreur de suppression du canal :", error.message);
            addLog("ERREUR: Le protocole de rupture a échoué (Voir Console).");
            // Si la DB refuse, on remet le canal dans l'interface pour ne pas mentir à l'Agent
            fetchChannels();
        }
    };

    if (!isInitialized) return <div className="h-screen bg-black flex items-center justify-center text-primary"><Loader2 className="animate-spin" /></div>;

    return (
        <div
            className="bg-background-dark text-slate-300 font-display h-[100dvh] w-full overflow-hidden flex flex-col relative touch-none"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Background Elements (TACTICAL GLOBE) */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <TacticalGlobe
                    mode={status === 'LIST' ? 'LOCKED' : status}
                    targetCoordinates={(status === 'LOCKED' || status === 'LIST') ? [48.8566, 2.3522] : null}
                />
            </div>

            <div className="relative z-10 flex flex-col h-full w-full max-w-md mx-auto bg-black/20 border-x border-white/5 shadow-2xl">
                {/* Header */}
                <header className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top,1.5rem)] pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_15px_rgba(19,200,236,0.2)]">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold tracking-wider text-primary text-glow">COMMAND_NODE</h1>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary breathing-dot"></span>
                                <span className="text-[10px] text-gray-400 font-mono tracking-widest">ONLINE</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel px-3 py-1 rounded-full flex items-center gap-2">
                        <span className="text-xs font-mono text-primary animate-pulse">SECURE</span>
                    </div>
                </header>

                {/* Main Dashboard Area */}
                <main className="flex-1 flex flex-col px-4 gap-4 overflow-y-auto no-scrollbar pb-32">

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="glass-panel rounded-xl p-2 flex flex-col items-center justify-center border-t-2 border-t-primary/50">
                            <span className="text-[8px] text-gray-400 tracking-wider">CPU</span>
                            <span className="text-lg font-bold font-mono text-white">34%</span>
                        </div>
                        <div className="glass-panel rounded-xl p-2 flex flex-col items-center justify-center border-t-2 border-t-accent-amber/50">
                            <span className="text-[8px] text-gray-400 tracking-wider">MEM</span>
                            <span className="text-lg font-bold font-mono text-accent-amber text-glow-amber">89%</span>
                        </div>
                        <div className="glass-panel rounded-xl p-2 flex flex-col items-center justify-center border-t-2 border-t-primary/50">
                            <span className="text-[8px] text-gray-400 tracking-wider">NET</span>
                            <span className="text-lg font-bold font-mono text-white">4TB</span>
                        </div>
                    </div>

                    {/* ALERTES : Requêtes de liaison entrantes */}
                    {incomingRequests.length > 0 && (
                        <div className="mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            <h3 className="text-orange-500 font-bold text-[10px] mb-2 tracking-widest uppercase flex items-center gap-1">
                                <span className="animate-pulse">⚠️</span> {incomingRequests.length} requête(s) de liaison
                            </h3>
                            <div className="space-y-2">
                                {incomingRequests.map((req) => (
                                    <div key={req.id} className="bg-slate-900/90 border-l-4 border-orange-500 p-3 rounded-r-xl flex justify-between items-center shadow-lg gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-slate-200 text-xs font-mono truncate">{req.topic || 'Demande de liaison'}</p>
                                            <span className="text-[9px] text-slate-500 uppercase tracking-tighter">Source: {req.requester_id?.slice(0, 8)}...</span>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => handleResponse(req, 'accept')} className="bg-green-600/20 text-green-400 border border-green-600/50 px-2 py-1 rounded text-[9px] font-bold uppercase hover:bg-green-600 hover:text-white transition-all">✅</button>
                                            <button onClick={() => handleResponse(req, 'refuse')} className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded text-[9px] font-bold uppercase hover:bg-slate-700 transition-all">❌</button>
                                            <button onClick={() => handleResponse(req, 'block')} className="bg-red-900/20 text-red-500 border border-red-900/50 px-2 py-1 rounded text-[9px] font-bold uppercase hover:bg-red-900 hover:text-white transition-all">🚫</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* CENTRAL NEURAL MAP (Scanner & Overlays) */}
                    <div className="glass-panel rounded-2xl p-1 relative overflow-visible flex flex-col items-center justify-center group min-h-[250px]">

                        {/* ÉTAT 1 : SCANNER (Visible si IDLE ou SCANNING) */}
                        {(status === 'IDLE' || status === 'SCANNING') && (
                            <div className={`transition-all duration-500 w-full ${status === 'SCANNING' ? 'opacity-80 pointer-events-none' : 'opacity-100'}`}>
                                <Scanner onScanStart={triggerManualScan} />
                                {status === 'SCANNING' && (
                                    <p className="text-center text-cyan-400 mt-2 font-mono text-xs">
                                        TRIANGULATION EN COURS...
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ÉTAT 2-A : RÉSULTAT SCAN BASIC */}
                        {status === 'LIST' && basicResult && !deepResult && (
                            <div className="absolute inset-0 z-20 flex flex-col p-4 w-full h-full bg-black/95 backdrop-blur-xl overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-300">
                                <button
                                    onClick={() => { setStatus('IDLE'); setBasicResult(null); }}
                                    className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white"
                                >
                                    <X size={24} />
                                </button>

                                <div className="mt-6 space-y-4">
                                    {/* Statut global */}
                                    <div className={`p-4 border-l-4 bg-white/5 rounded ${basicResult.globalStatus === 'GREEN' ? 'border-emerald-500' :
                                        basicResult.globalStatus === 'ORANGE' ? 'border-amber-500' : 'border-red-500'
                                        }`}>
                                        <p className="text-[10px] font-mono text-gray-500 mb-1">ANALYSE DE SURFACE</p>
                                        <h2 className="text-lg font-bold tracking-tighter text-white">
                                            Statut : <span className={basicResult.globalStatus === 'GREEN' ? 'text-emerald-400' : basicResult.globalStatus === 'ORANGE' ? 'text-amber-400' : 'text-red-400'}>{basicResult.globalStatus}</span>
                                        </h2>
                                        <p className="text-gray-400 italic text-sm mt-2">{basicResult.analysisSummary}</p>
                                    </div>

                                    {/* Commandes Phase 1 */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={triggerDeepAudit}
                                            className="col-span-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2 text-sm"
                                        >
                                            <span>ðŸ‘ï¸</span> AUDIT PROFOND
                                        </button>
                                        <button
                                            onClick={() => { setStatus('IDLE'); setBasicResult(null); }}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl transition-all text-sm"
                                        >
                                            ANNULER
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (profileId && basicResult?.targetId) {
                                                    supabase.from('BlockList').insert({ blockerId: profileId, blockedId: basicResult.targetId });
                                                    setBlockedIds(prev => [...prev, basicResult.targetId]);
                                                    addLog('SÉCURITÉ: Cible bannie.');
                                                }
                                                setStatus('IDLE'); setBasicResult(null);
                                            }}
                                            className="bg-red-900/40 hover:bg-red-800/70 text-red-400 border border-red-900 font-bold py-2 rounded-xl transition-all text-sm"
                                        >
                                            BLOQUER
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CHARGEMENT AUDIT PROFOND */}
                        {status === 'SCANNING' && basicResult && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl">
                                <div className="text-4xl animate-spin mb-4">âš™ï¸</div>
                                <p className="text-amber-400 font-mono text-sm tracking-widest">EXTRACTION PROFONDE...</p>
                            </div>
                        )}

                        {/* ÉTAT 2-B : RAPPORT AUDIT PROFOND CONSOLIDÉ */}
                        {status === 'LIST' && deepResult && (
                            <div className="absolute inset-0 z-20 flex flex-col p-4 w-full h-full bg-black/95 backdrop-blur-xl overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-300">
                                <button
                                    onClick={() => { setStatus('IDLE'); setBasicResult(null); setDeepResult(null); }}
                                    className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white"
                                >
                                    <X size={24} />
                                </button>

                                <div className="mt-6 space-y-4 pb-4">
                                    {/* En-tête + Score unique */}
                                    <div className="flex justify-between items-center border-b border-orange-900/50 pb-4">
                                        <h3 className="text-orange-400 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                                            <span>🔥</span> RAPPORT D'AUDIT PROFOND
                                        </h3>
                                        <div className="text-2xl font-mono font-bold text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]">
                                            {deepResult.overallMatchScore ?? deepResult.matchScore ?? 0}%
                                        </div>
                                    </div>

                                    {/* Classification cible */}
                                    <div className="bg-black/60 p-4 rounded border border-orange-900/30">
                                        <span className="text-orange-500 font-bold text-[10px] uppercase mb-2 tracking-widest block opacity-80">
                                            Classification Cible
                                        </span>
                                        <p className="text-slate-200 text-sm font-mono">
                                            {deepResult.targetClassification ?? 'Entité non classifiée'}
                                        </p>
                                    </div>

                                    {/* Analyse tactique unifiée */}
                                    <div className="bg-black/60 p-4 rounded border border-orange-900/30">
                                        <span className="text-orange-500 font-bold text-[10px] uppercase mb-2 tracking-widest block opacity-80">
                                            Analyse Tactique
                                        </span>
                                        <p className="text-slate-300 text-sm leading-relaxed">
                                            {deepResult.unifiedAnalysis ?? deepResult.analyse ?? deepResult.analysisSummary ?? 'Analyse en cours...'}
                                        </p>
                                    </div>

                                    {/* Alignement stratégique */}
                                    <div className="bg-black/60 p-4 rounded border border-orange-900/30">
                                        <span className="text-orange-500 font-bold text-[10px] uppercase mb-2 tracking-widest block opacity-80">
                                            Alignement Stratégique
                                        </span>
                                        <p className="text-cyan-400 text-sm leading-relaxed">
                                            {deepResult.strategicAlignment ?? 'Évaluation des bénéfices en cours...'}
                                        </p>
                                    </div>

                                    {/* Commandes Phase 2 */}
                                    <div className="grid grid-cols-3 gap-2 pt-2">
                                        <button
                                            onClick={handleContactTarget}
                                            className="bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all uppercase tracking-wider text-[11px]"
                                        >
                                            💬 Contacter
                                        </button>
                                        <button
                                            onClick={() => { setStatus('IDLE'); setBasicResult(null); setDeepResult(null); }}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all uppercase tracking-wider text-[11px]"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (profileId && deepResult?.targetId) {
                                                    supabase.from('BlockList').insert({ blockerId: profileId, blockedId: deepResult.targetId });
                                                    setBlockedIds(prev => [...prev, deepResult.targetId]);
                                                    addLog('SÉCURITÉ: Cible bannie.');
                                                }
                                                setStatus('IDLE'); setBasicResult(null); setDeepResult(null);
                                            }}
                                            className="bg-red-900/40 hover:bg-red-800/70 text-red-400 border border-red-900/50 font-bold py-3 rounded-xl transition-all uppercase tracking-wider text-[11px]"
                                        >
                                            Bloquer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ÉTAT 3 : MATCH LOCKED (Legacy/Single Audit - kept for compatibility if needed, but not reached via scanGlobalNetwork) */}
                        {status === 'LOCKED' && matchData && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center p-2">
                                <MatchOverlay
                                    data={matchData}
                                    onAudit={async () => {
                                        // Legacy path if we ever manually set LOCKED
                                        if (matchData.targetId) handleSelectOpportunity({ targetId: matchData.targetId, targetName: matchData.name });
                                    }}
                                    onCancel={() => { setStatus('IDLE'); setMatchData(null); }}
                                />
                            </div>
                        )}

                        {isDragging && (
                            <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-2 border-primary border-dashed m-2 rounded-xl">
                                <Upload className="text-primary animate-bounce" size={32} />
                                <p className="text-xs font-bold text-white mt-2">INGESTION DONNÉES</p>
                            </div>
                        )}
                    </div>

                    {/* Active Channels List */}
                    <div className="glass-panel rounded-xl p-4 flex flex-col gap-3 min-h-[120px]">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <h3 className="text-xs text-accent-amber font-bold tracking-widest flex items-center gap-2">
                                <Radio size={12} /> CHANNELS ({channels.length})
                            </h3>
                        </div>
                        <div className="space-y-2 overflow-y-auto max-h-32 custom-scrollbar">
                            {channels.filter(c => c.topic && c.topic !== 'LIAISON SÉCURISÉE').map((channel) => { // On filtre les canaux sans sujet ou par défaut
                                const otherId = channel.member_one_id === profileId ? channel.member_two_id : channel.member_one_id;

                                return (
                                    <div key={channel.id} className="bg-slate-900 border border-blue-500/30 p-4 rounded-xl mb-3">
                                        <div className="flex justify-between items-center gap-4">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-blue-400 font-bold text-xs uppercase truncate">{channel.topic}</h4>
                                                <p className="text-[10px] text-slate-500 truncate">PARTENAIRE : {otherId?.slice(0, 8)}...</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setChatPartnerId(otherId);
                                                        setActiveChannelId(channel.id);
                                                        setIsChatOpen(true);
                                                        // ðŸŸ¢ On efface la notification quand on ouvre le canal
                                                        setUnreadIds(prev => prev.filter(id => id !== channel.id));
                                                    }}
                                                    className="relative bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-[10px] font-bold whitespace-nowrap"
                                                >
                                                    OUVRIR TCHAT
                                                    {/* ðŸŸ¢ LA PASTILLE ROUGE DE NOTIFICATION */}
                                                    {unreadIds.includes(channel.id) && (
                                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-black shadow-sm"></span>
                                                        </span>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteChannel(channel.id, e)}
                                                    className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                                    title="Rompre la liaison"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {channels.length === 0 && <p className="text-[10px] text-gray-600 italic text-center py-2">Aucun signal.</p>}
                        </div>
                    </div>

                    {/* Terminal Logs */}
                    <div className="glass-panel rounded-xl p-3 flex flex-col gap-2 h-32">
                        <h3 className="text-[9px] text-gray-500 font-bold tracking-widest uppercase mb-1">System Log</h3>
                        <div className="font-mono text-[9px] space-y-1 text-primary/80 overflow-y-auto custom-scrollbar flex-1">
                            {logs.map((l, i) => <div key={i} className="border-l border-primary/20 pl-2">{l}</div>)}
                        </div>
                    </div>

                    {/* Input Pensée Rapide */}
                    <form onSubmit={handleQuickThoughtSubmit} className="glass-panel rounded-full p-1 flex items-center gap-2 pl-4">
                        <input
                            type="text"
                            value={quickThought}
                            onChange={e => setQuickThought(e.target.value)}
                            placeholder="Saisir pensée rapide..."
                            className="bg-transparent border-none text-base md:text-xs text-white focus:ring-0 flex-1 placeholder:text-gray-600"
                        />
                        <button type="submit" className="p-2 bg-primary/20 rounded-full text-primary hover:bg-primary hover:text-black transition-colors active:scale-90">
                            <Send size={14} />
                        </button>
                    </form>

                </main>

                {/* Bottom Navigation Dock */}
                <div className="absolute bottom-6 left-4 right-4 z-50 pb-[env(safe-area-inset-bottom)]">
                    <div className="glass-panel rounded-2xl p-2 flex items-center justify-between shadow-2xl bg-black/90">
                        <button onClick={() => setShowBlockPanel(true)} className="flex-1 flex flex-col items-center gap-1 py-1 group active:scale-95">
                            <div className="w-10 h-10 rounded-xl bg-transparent group-hover:bg-red-500/20 flex items-center justify-center text-gray-400 group-hover:text-red-500 transition-all">
                                <ShieldX size={20} />
                            </div>
                        </button>

                        <button onClick={triggerManualScan} className="flex items-center justify-center -mt-8 mx-2 group" disabled={isAnalyzing}>
                            <div className="w-16 h-16 rounded-full bg-surface-dark border border-primary/50 shadow-[0_0_20px_rgba(19,200,236,0.3)] flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform">
                                <Radar className={`relative z-10 ${(status === 'SCANNING' || isAnalyzing) ? 'text-accent-amber' : 'text-primary'}`} size={28} />
                            </div>
                        </button>

                        <button onClick={() => setShowCortexPanel(true)} className="flex-1 flex flex-col items-center gap-1 py-1 group active:scale-95">
                            <div className="w-10 h-10 rounded-xl bg-transparent group-hover:bg-primary/20 flex items-center justify-center text-gray-400 group-hover:text-primary transition-all">
                                <BrainCircuit size={20} />
                            </div>
                        </button>
                    </div>
                </div>
            </div >

            {/* SECURE CHAT OVERLAY */}
            {isChatOpen && chatPartnerId && profileId && activeChannelId && ( // <-- Ajoutez activeChannelId ici
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="w-full max-w-lg h-[80vh] min-h-[500px]">
                        <SecureChat
                            myId={profileId}
                            partnerId={chatPartnerId}
                            channelId={activeChannelId} // â¬…ï¸ TRÈS IMPORTANT : Passer l'ID du Canal
                            onClose={() => setIsChatOpen(false)}
                        />
                    </div>
                </div>
            )}

            {
                showCortexPanel && (
                    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl p-4 flex flex-col animate-in fade-in">
                        <button onClick={() => setShowCortexPanel(false)} className="self-end p-2 text-white mb-2"><X /></button>
                        <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black">
                            <KnowledgeIngester profileId={profileId!} memories={memories} onRefresh={() => loadMemories(profileId!)} />
                        </div>
                    </div>
                )
            }

            {/* BlockListManager - Assuming it's a component that should exist or be imported, checking availability in codebase later if needed but keeping structure valid */}
            {showBlockPanel && profileId && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center">
                    <div className="bg-slate-900 p-6 rounded-xl border border-red-900/50">
                        <h3 className="text-red-500 font-bold mb-4">PROTOCOLE D'EXCLUSION</h3>
                        <p className="text-gray-400 mb-4">Liste des entités bannies:</p>
                        <ul className="mb-4 space-y-2">
                            {blockedIds.map(id => <li key={id} className="text-xs font-mono text-red-400">{id}</li>)}
                            {blockedIds.length === 0 && <li className="text-xs text-gray-600">Aucune menace active.</li>}
                        </ul>
                        <button onClick={() => setShowBlockPanel(false)} className="bg-slate-800 text-white px-4 py-2 rounded">Fermer</button>
                    </div>
                </div>
            )}

            {/* ÉTAT 3 : AUDIT COMPLET (FullScreen Overlay) */}
            {
                status === 'AUDIT' && matchData && (
                    <DeepAuditReport
                        data={matchData}
                        onAction={handleAction}
                    />
                )
            }


        </div >
    );
}



// --- SOUS-COMPOSANTS EXISTANTS ---
function BlockListManager({ profileId, onClose }: any) {
    return (
        <div onClick={onClose} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#0f1618] p-6 rounded-2xl border border-red-900/50 w-80 shadow-2xl relative">
                <h2 className="text-red-500 font-bold mb-4 tracking-widest flex items-center gap-2"><ShieldX size={18} /> BLACKLIST</h2>
                <p className="text-xs text-slate-500 mb-6 font-mono">Liste de confinement vide.</p>
                <button className="w-full py-2 bg-red-900/20 text-red-500 border border-red-900/50 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all" onClick={onClose}>FERMER</button>
            </div>
        </div>
    );
}

// InterceptorInterface removed as it is replaced by Scanner/MatchOverlay/AuditReport logic
