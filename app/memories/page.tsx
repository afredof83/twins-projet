'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseBrowser';
import {
    Upload, Link2, Terminal, Brain, FileText,
    Globe, ChevronRight, ArrowLeft, Trash2, Loader2,
    CheckCircle2, AlertTriangle, Wifi
} from 'lucide-react';

// â”€â”€â”€ TYPE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Memory {
    id: string;
    content: string;
    type: string;
    source?: string;
    created_at: string;
}

type LogLevel = 'info' | 'success' | 'error' | 'warning';
interface Log { msg: string; level: LogLevel; ts: string }

// â”€â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const typeIcon: Record<string, string> = {
    document: 'ðŸ“„', knowledge: '🌐', THOUGHT: 'ðŸ’­', thought: 'ðŸ’­',
    secret: 'ðŸ”’', default: 'ðŸ§©',
};
const typeColor: Record<string, string> = {
    document: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
    knowledge: 'bg-violet-900/50 text-violet-300 border-violet-700/50',
    THOUGHT: 'bg-cyan-900/50  text-cyan-300  border-cyan-700/50',
    thought: 'bg-cyan-900/50  text-cyan-300  border-cyan-700/50',
    secret: 'bg-red-900/50   text-red-300   border-red-700/50',
    default: 'bg-slate-800    text-slate-400  border-slate-700',
};

// â”€â”€â”€ COMPOSANT PRINCIPAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CortexManager() {
    const router = useRouter();
    const [supabase] = useState(() => createClient());

    const [profileId, setProfileId] = useState<string | null>(null);
    const [memories, setMemories] = useState<Memory[]>([]);
    const [logs, setLogs] = useState<Log[]>([
        { msg: '[SYSTÈME] Cortex en ligne. En attente de données...', level: 'info', ts: now() }
    ]);
    const [isDragging, setIsDragging] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isScraping, setIsScraping] = useState(false);
    // États éditeur de fragments
    const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const logEndRef = useRef<HTMLDivElement>(null);

    // â”€â”€ Auth check â”€â”€
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
            if (!user) { router.push('/'); return; }
            setProfileId(user.id);
        });
    }, []);

    // â”€â”€ Load memories quand profileId est dispo â”€â”€
    useEffect(() => {
        if (profileId) fetchMemories();
    }, [profileId]);

    // â”€â”€ Auto-scroll logs â”€â”€
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    function now() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    const addLog = (msg: string, level: LogLevel = 'info') => {
        setLogs(prev => [...prev.slice(-19), { msg, level, ts: now() }]);
    };

    // â”€â”€ Fetch mémoires récentes â”€â”€
    const fetchMemories = async () => {
        if (!profileId) return;
        try {
            const res = await fetch(`/api/memories?profileId=${profileId}`);
            const data = await res.json();
            if (data.memories) setMemories(data.memories.slice(0, 20));
        } catch {
            addLog('[ERREUR] Impossible de charger les archives.', 'error');
        }
    };

    // â”€â”€ Upload fichier â”€â”€
    const handleFileUpload = async (file: File) => {
        setIsUploading(true);
        addLog(`[SENSOR] Analyse de la cible : ${file.name} (${(file.size / 1024).toFixed(1)} Ko)`, 'info');

        // Récupération de la session complète pour extraire le Bearer token
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            addLog('[CRITIQUE] Utilisateur non authentifié. Connexion refusée.', 'error');
            setIsUploading(false);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('profileId', session.user.id);

        try {
            const res = await fetch('/api/sensors/upload', {
                method: 'POST',
                // ✅ Passeport d'identité transmis à l'API
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });
            const data = await res.json();

            if (data.success) {
                addLog(`[SUCCÈS] ${data.fragments} fragment(s) de "${file.name}" gravés.`, 'success');
                await fetchMemories();

                // ðŸŸ¢ NOUVEAU : On réveille le Gardien silencieusement en arrière-plan !
                // On ne met pas de "await" devant le fetch, pour ne pas geler l'écran de l'utilisateur.
                console.log("ðŸ¦‡ Envoi du signal au Gardien...");
                fetch('/api/guardian', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        profileId: session.user.id,
                        newMemoryContent: `Nouveau fichier analysé : ${file.name}. Ce document a été ajouté à sa base de données.` // Vous pourrez remplacer ça par le vrai texte extrait plus tard
                    })
                }).catch(err => console.error("Erreur du Gardien :", err));
            } else {
                addLog(`[ERREUR SENSOR] ${data.error || 'Échec de l\'ingestion.'}`, 'error');
            }
        } catch {
            addLog('[CRITIQUE] Échec de la liaison de transfert.', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    // â”€â”€ Scrape URL â”€â”€
    const handleUrlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!urlInput) return;

        const targetUrl = urlInput.trim();
        setUrlInput('');
        setIsScraping(true);
        addLog(`[RÉSEAU] Extraction des données depuis : ${targetUrl}...`, 'info');

        // Récupération du passeport session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            addLog('[CRITIQUE] Accès réseau refusé (Non authentifié).', 'error');
            setIsScraping(false);
            return;
        }

        try {
            const res = await fetch('/api/sensors/scrape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`, // ✅ Passeport transmis
                },
                body: JSON.stringify({ url: targetUrl, profileId: session.user.id }),
            });
            const data = await res.json();

            if (data.success) {
                addLog(`[SUCCÈS] ${data.fragments} fragment(s) du site extraits et indexés.`, 'success');
                await fetchMemories();
            } else {
                addLog(`[ERREUR SCRAPER] ${data.error || 'Scraping échoué.'}`, 'error');
            }
        } catch {
            addLog('[CRITIQUE] Échec de la connexion au module Scraper.', 'error');
        } finally {
            setIsScraping(false);
        }
    };

    // â”€â”€ Drag & Drop â”€â”€
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
    };

    // â”€â”€ Delete mémoire (avec Bearer token + confirmation) â”€â”€
    const handleDeleteMemory = async (e: React.MouseEvent, memoryId: string) => {
        e.stopPropagation(); // Empêche d'ouvrir la modale d'édition

        if (!window.confirm('Avertissement : Voulez-vous vraiment purger ce fragment de votre mémoire ? Cette action est irréversible.')) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { addLog('[CRITIQUE] Session expirée.', 'error'); return; }

        // Mise à jour optimiste immédiate
        setMemories(prev => prev.filter(m => m.id !== memoryId));
        addLog(`[PURGE] Incinération du fragment ${memoryId.slice(0, 8)}...`, 'warning');

        try {
            const res = await fetch('/api/memories', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ id: memoryId, profileId: session.user.id }),
            });
            const data = await res.json();
            if (data.success) {
                addLog('[SUCCÈS] Fragment mémoriel incinéré.', 'success');
            } else {
                addLog(`[ERREUR] La purge a échoué : ${data.error}`, 'error');
                // Rollback : on recharge depuis l'API
                fetchMemories();
            }
        } catch {
            addLog('[CRITIQUE] Échec de connexion lors de la purge.', 'error');
            fetchMemories();
        }
    };

    // â”€â”€ Sauvegarde édition avec re-vectorisation â”€â”€
    const handleSaveEdit = async () => {
        if (!editingMemory) return;
        setIsUpdating(true);
        addLog('[MODIFICATION] Re-calcul vectoriel du fragment...', 'info');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            addLog('[CRITIQUE] Session expirée.', 'error');
            setIsUpdating(false);
            return;
        }

        try {
            const res = await fetch('/api/memories', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    id: editingMemory.id,
                    content: editContent,
                    profileId: session.user.id,
                }),
            });
            const data = await res.json();
            if (data.success) {
                addLog('[SUCCÈS] Fragment mis à jour et re-vectorisé.', 'success');
                setMemories(prev => prev.map(m => m.id === editingMemory.id ? { ...m, content: editContent } : m));
                setEditingMemory(null);
            } else {
                addLog(`[ERREUR] ${data.error || 'Modification échouée.'}`, 'error');
            }
        } catch {
            addLog('[CRITIQUE] Échec de la connexion lors de l\'édition.', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    // â”€â”€ Loading state â”€â”€
    if (!profileId) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex items-center gap-3 text-blue-400 font-mono">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Authentification Cortex...</span>
                </div>
            </div>
        );
    }

    // â”€â”€â”€ RENDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-mono p-4 md:p-8 selection:bg-blue-800">

            {/* â”€â”€ SCANLINES overlay (décoratif) â”€â”€ */}
            <div
                className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)' }}
            />

            <div className="relative z-10 max-w-6xl mx-auto">

                {/* â”€â”€ HEADER â”€â”€ */}
                <header className="flex items-start justify-between mb-8 pb-4 border-b border-blue-900/50">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                            <span className="text-[10px] text-blue-600 tracking-[0.3em] uppercase">Twins Neural Interface v2.6</span>
                        </div>
                        <h1 className="text-3xl font-black text-blue-400 tracking-tight drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]">
                            &gt; CORTEX_DATA_MANAGER
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Interface d'ingestion neuronale â€” Enrichissement de la mémoire vectorielle
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-2 text-xs text-slate-500 hover:text-blue-400 transition-colors px-3 py-2 border border-slate-800 hover:border-blue-800 rounded-lg"
                    >
                        <ArrowLeft size={14} /> Dashboard
                    </button>
                </header>

                {/* â”€â”€ GRID PRINCIPALE â”€â”€ */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* â”€â”€ COL GAUCHE : ZONE D'INGESTION â”€â”€ */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* DROPZONE */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                            className={`
                relative flex flex-col items-center justify-center p-10 rounded-2xl border-2 border-dashed
                cursor-pointer transition-all duration-300 group min-h-[220px]
                ${isDragging
                                    ? 'border-blue-400 bg-blue-950/40 shadow-[0_0_40px_rgba(59,130,246,0.15)] scale-[1.005]'
                                    : isUploading
                                        ? 'border-blue-600/50 bg-slate-900/50 cursor-not-allowed'
                                        : 'border-slate-700 bg-slate-900/30 hover:border-blue-700 hover:bg-blue-950/20 hover:shadow-[0_0_30px_rgba(59,130,246,0.08)]'
                                }
              `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".pdf,.txt,.csv,.docx,.md,.json"
                                onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                            />

                            {isUploading ? (
                                <div className="flex flex-col items-center gap-3 text-blue-400">
                                    <Loader2 size={40} className="animate-spin" />
                                    <span className="text-sm animate-pulse">Vectorisation en cours...</span>
                                </div>
                            ) : (
                                <>
                                    <div className={`
                    w-20 h-20 rounded-2xl border flex items-center justify-center mb-5 transition-all duration-300
                    ${isDragging
                                            ? 'border-blue-400 bg-blue-900/50 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                                            : 'border-blue-900 bg-blue-950/30 group-hover:border-blue-700 group-hover:bg-blue-900/30'
                                        }
                  `}>
                                        <Upload
                                            size={32}
                                            className={`transition-colors ${isDragging ? 'text-blue-300' : 'text-blue-600 group-hover:text-blue-400'}`}
                                        />
                                    </div>

                                    <p className="text-base font-bold text-blue-300 mb-1 tracking-wide group-hover:text-blue-200 transition-colors">
                                        [ INITIALISER TRANSFERT FICHIER ]
                                    </p>
                                    <p className="text-xs text-slate-500 text-center">
                                        Glissez-déposez ou cliquez pour sélectionner<br />
                                        <span className="text-slate-600">PDF Â· TXT Â· CSV Â· DOCX Â· MD Â· JSON</span>
                                    </p>

                                    {isDragging && (
                                        <div className="absolute inset-0 flex items-center justify-center rounded-2xl">
                                            <div className="text-center">
                                                <p className="text-2xl font-black text-blue-300 animate-pulse tracking-widest">
                                                    DÉPOSER
                                                </p>
                                                <p className="text-xs text-blue-500 mt-1">Ingestion automatique</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* INGESTION URL */}
                        <form
                            onSubmit={handleUrlSubmit}
                            className="flex gap-2 p-4 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-slate-700 transition-colors"
                        >
                            <div className="flex items-center justify-center w-10 h-10 bg-blue-950/50 border border-blue-900 rounded-xl flex-shrink-0">
                                <Link2 size={16} className="text-blue-400" />
                            </div>
                            <input
                                type="url"
                                value={urlInput}
                                onChange={e => setUrlInput(e.target.value)}
                                placeholder="https://article-cible.com/analyse..."
                                disabled={isScraping}
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-blue-100 outline-none
                  focus:border-blue-600 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all
                  placeholder:text-slate-600 disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={isScraping || !urlInput}
                                className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed
                  text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all
                  shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
                            >
                                {isScraping ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                                {isScraping ? 'SCAN...' : 'SCAN'}
                            </button>
                        </form>

                        {/* ARCHIVES NEURALES */}
                        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
                                <h3 className="text-xs font-bold text-blue-400 tracking-widest flex items-center gap-2">
                                    <Brain size={13} /> ARCHIVES NEURALES
                                    <span className="ml-2 text-slate-600 font-normal">({memories.length} fragments)</span>
                                </h3>
                                <button
                                    onClick={fetchMemories}
                                    className="text-[10px] text-slate-600 hover:text-blue-400 transition-colors tracking-widest"
                                >
                                    ACTUALISER
                                </button>
                            </div>

                            <div className="divide-y divide-slate-800/50 max-h-80 overflow-y-auto custom-scrollbar">
                                {memories.length === 0 ? (
                                    <div className="p-8 text-center text-slate-600 text-xs italic">
                                        Aucun fragment en mémoire. Déposez un fichier pour commencer.
                                    </div>
                                ) : (
                                    memories.map(m => (
                                        <div
                                            key={m.id}
                                            onClick={() => { setEditingMemory(m); setEditContent(m.content); }}
                                            className="flex items-start gap-3 px-5 py-3 hover:bg-blue-950/20 hover:border-l-2 hover:border-l-blue-600 transition-all cursor-pointer group"
                                        >
                                            {/* Badge type */}
                                            <span className={`mt-0.5 flex-shrink-0 text-[10px] px-2 py-0.5 rounded border font-bold tracking-wider ${typeColor[m.type] || typeColor.default}`}>
                                                {typeIcon[m.type] || typeIcon.default}&nbsp;
                                                {m.type?.toUpperCase().slice(0, 4)}
                                            </span>

                                            {/* Contenu */}
                                            <p className="flex-1 text-xs text-slate-400 line-clamp-2 leading-relaxed group-hover:text-slate-300">
                                                {m.content}
                                            </p>

                                            {/* Date + actions */}
                                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                <span className="text-[9px] text-slate-600">
                                                    {new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                </span>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <span className="text-[9px] text-blue-500 tracking-wider">ÉDITER</span>
                                                    <button
                                                        onClick={e => handleDeleteMemory(e, m.id)}
                                                        className="text-slate-700 hover:text-red-500 transition-colors"
                                                        title="Purger ce fragment"
                                                    >
                                                        <Trash2 size={11} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* â”€â”€ COL DROITE : TERMINAL â”€â”€ */}
                    <div className="space-y-5">

                        {/* STATUS BAR */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
                                <span className="text-[9px] text-slate-600 tracking-widest mb-1">STATUT</span>
                                <div className="flex items-center gap-1.5">
                                    <Wifi size={12} className="text-blue-400 animate-pulse" />
                                    <span className="text-xs font-bold text-blue-300">EN LIGNE</span>
                                </div>
                            </div>
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
                                <span className="text-[9px] text-slate-600 tracking-widest mb-1">FRAGMENTS</span>
                                <span className="text-xl font-black text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]">
                                    {memories.length}
                                </span>
                            </div>
                        </div>

                        {/* TERMINAL LOGS */}
                        <div className="bg-black border border-slate-800 rounded-2xl overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-950">
                                <Terminal size={12} className="text-blue-600" />
                                <span className="text-[9px] text-slate-600 tracking-widest font-bold">JOURNAL DES OPÉRATIONS</span>
                            </div>

                            <div className="p-4 h-72 overflow-y-auto space-y-1.5 custom-scrollbar text-xs">
                                {logs.map((log, i) => (
                                    <div key={i} className={`flex gap-2 leading-relaxed ${log.level === 'error' ? 'text-red-400' :
                                        log.level === 'success' ? 'text-emerald-400' :
                                            log.level === 'warning' ? 'text-amber-400' :
                                                'text-slate-500'
                                        }`}>
                                        <span className="text-slate-700 flex-shrink-0">{log.ts}</span>
                                        <span className="flex-1">{log.msg}</span>
                                        {log.level === 'success' && <CheckCircle2 size={11} className="flex-shrink-0 mt-0.5" />}
                                        {log.level === 'error' && <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />}
                                    </div>
                                ))}
                                <div ref={logEndRef} />
                            </div>
                        </div>

                        {/* GUIDE RAPIDE */}
                        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-4 space-y-3">
                            <h3 className="text-[10px] font-black text-slate-500 tracking-widest">PROTOCOLES D'INGESTION</h3>
                            {[
                                { icon: <FileText size={13} />, label: 'Fichiers', desc: 'PDF, TXT, CSV, DOCX â€” Extraction vectorielle automatique' },
                                { icon: <Globe size={13} />, label: 'URL Web', desc: 'Scraping + résumé Mistral AI â€” Indexation en mémoire' },
                            ].map(({ icon, label, desc }) => (
                                <div key={label} className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-blue-950/50 border border-blue-900/50 flex items-center justify-center flex-shrink-0 text-blue-500">
                                        {icon}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-blue-300">{label}</p>
                                        <p className="text-[10px] text-slate-600 leading-snug">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </div>

            {/* â”€â”€ MODALE D'ÉDITION SYNAPTIQUE â”€â”€ */}
            {editingMemory && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-blue-500/50 rounded-2xl w-full max-w-2xl flex flex-col shadow-[0_0_50px_rgba(59,130,246,0.15)]">
                        {/* Header modale */}
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-sm font-black text-blue-400 tracking-wider">ÉDITION DU FRAGMENT NEURONAL</h2>
                                <p className="text-[10px] text-slate-600 mt-0.5">{editingMemory.id}</p>
                            </div>
                            <button
                                onClick={() => setEditingMemory(null)}
                                className="text-slate-500 hover:text-white transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800"
                            >
                                ❌
                            </button>
                        </div>

                        {/* Textarea */}
                        <div className="p-4">
                            <textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                className="w-full h-64 bg-black border border-slate-700 rounded-xl p-4 text-cyan-50 font-mono text-xs outline-none
                                    focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all resize-none leading-relaxed"
                            />
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/50 rounded-b-2xl">
                            <button
                                onClick={() => setEditingMemory(null)}
                                disabled={isUpdating}
                                className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-40"
                            >
                                ANNULER
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={isUpdating}
                                className={`flex items-center gap-2 px-6 py-2 text-xs font-black text-white rounded-xl bg-blue-700 hover:bg-blue-600
                                    shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all
                                    ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isUpdating ? <><Loader2 size={12} className="animate-spin" /> RE-VECTORISATION...</> : 'SAUVEGARDER & INJECTER'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// â”€â”€â”€ WRAPPER (Suspense boundary) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function CortexPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={28} />
            </div>
        }>
            <CortexManager />
        </Suspense>
    );
}
