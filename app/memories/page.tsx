'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseBrowser';
import {
    Upload, Link2, Terminal, Brain, FileText,
    Globe, ChevronRight, ArrowLeft, Trash2, Loader2,
    CheckCircle2, AlertTriangle, Wifi
} from 'lucide-react';
import { getApiUrl } from '@/lib/api-config';

import CortexGrid from '@/components/cortex/CortexGrid';
// Server actions supprimées — on utilise fetch vers /api/memories et /api/guardian
// Server action supprimée — on utilise fetch vers /api/auth-guard

// ——— TYPE ————————————————————————————————————————————————————————————
interface Memory {
    id: string;
    content: string;
    type: string;
    source?: string | null;
    created_at?: string | Date;
    createdAt?: string | Date;
}

type LogLevel = 'info' | 'success' | 'error' | 'warning';
interface Log { msg: string; level: LogLevel; ts: string }

// ——— HELPERS ————————————————————————————————————————————————————————
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

// ——— COMPOSANT PRINCIPAL ————————————————————————————————————————————
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

    // Nouveaux States pour l'Assimilation Rapide (Profil)
    const [profileRawData, setProfileRawData] = useState('');
    const [isAssimilating, setIsAssimilating] = useState(false);

    // Nouveaux States pour la Pensée Rapide (Mémoire)
    const [quickThought, setQuickThought] = useState('');
    const [isSavingThought, setIsSavingThought] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const logEndRef = useRef<HTMLDivElement>(null);

    // — Auth check —
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
            if (!user) { router.push('/'); return; }
            setProfileId(user.id);
        });
    }, []);

    // ——— Load memories quand profileId est dispo ———
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
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const res = await fetch(getApiUrl(`/api/memories?profileId=${profileId}`), { headers });
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
            const headers: any = {};
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const data = await fetch(getApiUrl('/api/memories'), {
                method: 'POST',
                headers,
                body: formData
            }).then(r => r.json());

            if (data.success) {
                addLog(`[SUCCÈS] Fragment de "${file.name}" gravés.`, 'success');
                await fetchMemories();

                // 🟢 NOUVEAU : On réveille le Gardien silencieusement en arrière-plan !
                console.log("🦇 Envoi du signal au Gardien...");
                fetch(getApiUrl('/api/guardian'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profileId: session.user.id, text: `Nouveau fichier analysé : ${file.name}. Ce document a été ajouté à sa base de données.` })
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
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const data = await fetch(getApiUrl('/api/memories'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'scrapeUrl', url: targetUrl, profileId: session.user.id })
            }).then(r => r.json());

            if (data.success) {
                addLog(`[SUCCÈS] Fragments du site extraits et indexés.`, 'success');
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
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            await fetch(getApiUrl('/api/memories'), {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ memoryId })
            });
            addLog('[SUCCÈS] Fragment mémoriel incinéré.', 'success');
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
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const data = await fetch(getApiUrl('/api/memories'), {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ memoryId: editingMemory.id, newContent: editContent })
            }).then(r => r.json());
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
    // --- Fonction 1 : Assimilation de l'Identité ---
    const handleProfileAssimilation = async () => {
        if (!profileId || !profileRawData.trim()) return;
        setIsAssimilating(true);
        addLog('[MATRICE] Injection des données brutes en cours...', 'info');
        try {
            // La logique a été déplacée dans le composant d'onboarding
            // const result = await autoIngestProfile(profileId, profileRawData);
            // if (result?.success) {
            //     addLog("[SUCCÈS] ADN Assimilé. Matrice mise à jour.", 'success');
            //     setProfileRawData('');
            // } else {
            //     addLog(`[ERREUR] ${result?.error || "Échec de l'assimilation."}`, 'error');
            // }
            addLog("[DÉSACTIVÉ] Veuillez utiliser l'interface d'Onboarding pour l'ingestion du profil.", 'warning');
        } catch (e: any) {
            addLog("[CRITIQUE] Impossible de contacter le centre d'assimilation.", 'error');
        } finally {
            setIsAssimilating(false);
        }
    };

    // --- Fonction 2 : Pensée Rapide (Ex-Dashboard) ---
    const handleQuickThought = async () => {
        if (!quickThought.trim() || !profileId) return;
        setIsSavingThought(true);

        // ✅ Filtre anti-corruption : suppression des null bytes
        const cleanThought = quickThought.replace(/\0/g, '').replace(/\u0000/g, '').trim();
        addLog('[CORTEX] Archivage de la pensée rapide...', 'info');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                addLog('[CRITIQUE] Session expirée.', 'error');
                return;
            }

            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const data = await fetch(getApiUrl('/api/memories'), {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: 'addMemory',
                    content: cleanThought,
                    profileId: session.user.id,
                    type: 'thought'
                })
            }).then(r => r.json());

            if (data.error) throw new Error(data.error);

            setQuickThought('');
            addLog('[SUCCÈS] Pensée enregistrée dans le Cortex.', 'success');
            fetchMemories();
            router.refresh();
        } catch (err: any) {
            addLog(`[CRITIQUE] ${err.message || 'Échec de transmission.'}`, 'error');
        } finally {
            setIsSavingThought(false);
        }
    };

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
                            <span className="text-[10px] text-blue-600 tracking-[0.3em] uppercase">Ipse Neural Interface v2.6</span>
                        </div>
                        <h1 className="text-3xl font-black text-blue-400 tracking-tight drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]">
                            &gt; CORTEX_DATA_MANAGER
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Interface d'ingestion neuronale â€” Enrichissement de la mémoire vectorielle
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 text-xs text-slate-500 hover:text-blue-400 transition-colors px-3 py-2 border border-slate-800 hover:border-blue-800 rounded-lg"
                    >
                        <ArrowLeft size={14} /> Dashboard
                    </button>
                </header>

                {/* ── NOUVELLE GRILLE : SECTEURS MATRICE & CORTEX ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">

                    {/* --- SECTEUR 1 : MATRICE (Identité) --- */}
                    <div className="border border-cyan-500 bg-black/50 p-6 rounded shadow-[0_0_15px_rgba(0,255,255,0.1)] flex flex-col">
                        <h2 className="text-xl font-bold mb-2 flex items-center text-cyan-400">
                            <span className="text-2xl mr-2">🧬</span> 1. RECALIBRAGE DE LA MATRICE
                        </h2>
                        <p className="text-sm text-slate-400 mb-4 font-sans flex-1">
                            Copiez-collez votre CV, profil LinkedIn ou biographie. L'IA écrasera et mettra à jour votre ADN professionnel et psychologique.
                        </p>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 p-3 text-slate-300 rounded min-h-[120px] focus:border-cyan-500 focus:outline-none placeholder:text-slate-600"
                            placeholder="DONNÉES BRUTES (Ex: Copier-coller LinkedIn)..."
                            value={profileRawData}
                            onChange={(e) => setProfileRawData(e.target.value)}
                        />
                        <button
                            onClick={handleProfileAssimilation}
                            disabled={isAssimilating || profileRawData.length < 50}
                            className="mt-4 w-full bg-cyan-700 hover:bg-cyan-600 text-black font-black py-3 rounded-lg disabled:opacity-50 transition-all uppercase tracking-widest text-[11px]"
                        >
                            {isAssimilating ? 'ASSIMILATION NEURALE...' : 'INJECTER DANS LA MATRICE'}
                        </button>
                    </div>

                    {/* --- SECTEUR 2 : CORTEX (Mémoire) --- */}
                    <div className="border border-emerald-500 bg-black/50 p-6 rounded shadow-[0_0_15px_rgba(16,185,129,0.1)] flex flex-col">
                        <h2 className="text-xl font-bold mb-2 text-emerald-400 flex items-center">
                            <span className="text-2xl mr-2">🧠</span> 2. INGESTION MÉMOIRE RAPIDE
                        </h2>
                        <p className="text-sm text-slate-400 mb-4 font-sans flex-1">
                            Ajoutez une note tactique, une idée ou une information isolée que l'Agent doit retenir pour ses futurs scans.
                        </p>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 p-3 text-slate-300 rounded min-h-[120px] focus:border-emerald-500 focus:outline-none placeholder:text-slate-600"
                            placeholder="NOUVELLE PENSÉE / MÉMOIRE..."
                            value={quickThought}
                            onChange={(e) => setQuickThought(e.target.value)}
                        />
                        <button
                            onClick={handleQuickThought}
                            disabled={isSavingThought || quickThought.length < 5}
                            className="mt-4 w-full bg-emerald-700 hover:bg-emerald-600 text-black font-black py-3 rounded-lg disabled:opacity-50 transition-all uppercase tracking-widest text-[11px]"
                        >
                            {isSavingThought ? 'ENREGISTREMENT...' : 'SAUVEGARDER LA PENSÉE'}
                        </button>
                    </div>
                </div>

                {/* ── SECTEUR 3 / 4 : CAPTEURS LOURDS ET ARCHIVES ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── COL GAUCHE : CAPTEURS LOURDS ET ARCHIVES ── */}
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
                                        <span className="text-slate-600">PDF · TXT · CSV · DOCX · MD · JSON</span>
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

                            <div className="p-4 bg-black/20">
                                {memories.length === 0 ? (
                                    <div className="p-8 text-center text-slate-600 text-xs italic">
                                        Aucun fragment en mémoire. Déposez un fichier pour commencer.
                                    </div>
                                ) : (
                                    <CortexGrid userId={profileId ?? undefined} initialFragments={memories.map(m => ({
                                        id: m.id,
                                        content: m.content,
                                        createdAt: m.createdAt ? (m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt)) : (m.created_at ? String(m.created_at) : new Date().toISOString())
                                    }))} />
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
