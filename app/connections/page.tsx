'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Linkedin, Twitter, Instagram, Facebook,
    Github, Database, FileText, MessageCircle, Mail,
    Music, Video, Activity, Globe, Lock
} from 'lucide-react';

// --- CONFIGURATION DES MODULES ---
const MODULES = [
    {
        title: "Intelligence Sociale",
        description: "Analyse votre image publique et vos interactions.",
        color: "from-blue-500 to-cyan-500",
        platforms: [
            { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, xp: '+20 PRO', private: false },
            { id: 'twitter', name: 'X (Twitter)', icon: Twitter, xp: '+15 OPI', private: false },
            { id: 'instagram', name: 'Instagram', icon: Instagram, xp: '+10 STYLE', private: false },
            { id: 'facebook', name: 'Facebook', icon: Facebook, xp: '+10 MEMO', private: false },
        ]
    },
    {
        title: "Intelligence Technique",
        description: "Ingère votre savoir-faire et votre logique.",
        color: "from-slate-500 to-gray-400",
        platforms: [
            { id: 'github', name: 'GitHub', icon: Github, xp: '+30 LOGIC', private: false },
            { id: 'gitlab', name: 'GitLab', icon: Globe, xp: '+25 CODE', private: false },
            { id: 'medium', name: 'Medium', icon: FileText, xp: '+20 EDIT', private: false },
            { id: 'notion', name: 'Notion', icon: Database, xp: '+40 BRAIN', private: false },
        ]
    },
    {
        title: "Intelligence Émotionnelle",
        description: "Analyse privée. Comprend votre humour et vos sentiments.",
        color: "from-green-500 to-emerald-400",
        platforms: [
            { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, xp: '+50 SOUL', private: true },
            { id: 'discord', name: 'Discord', icon: MessageCircle, xp: '+30 CHAT', private: true },
            { id: 'email', name: 'Emails', icon: Mail, xp: '+20 ORGA', private: true },
        ]
    },
    {
        title: "Intelligence Culturelle",
        description: "Définit vos goûts musicaux et artistiques.",
        color: "from-pink-500 to-rose-500",
        platforms: [
            { id: 'spotify', name: 'Spotify', icon: Music, xp: '+15 VIBE', private: false },
            { id: 'youtube', name: 'YouTube', icon: Video, xp: '+15 LEARN', private: false },
            { id: 'netflix', name: 'Netflix', icon: Video, xp: '+10 TASTE', private: false },
            { id: 'strava', name: 'Strava', icon: Activity, xp: '+10 BIO', private: false },
        ]
    }
];

export default function NeuralLinkPage() {
    const [sources, setSources] = useState<any[]>([]);
    const [simulating, setSimulating] = useState<string | null>(null);

    // Chargement initial
    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/sources');
                if (res.ok) {
                    const data = await res.json();
                    setSources(Array.isArray(data) ? data : []);
                }
            } catch (e) { console.error(e); }
        }
        fetchData();
    }, []);

    // Simulation de connexion
    const handleConnect = (platformId: string) => {
        setSimulating(platformId);
        setTimeout(() => {
            const newSource = { platform: platformId.toUpperCase(), isConnected: true };
            setSources(prev => [...prev, newSource]);
            setSimulating(null);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-10 font-sans">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Header Navigation */}
                <div className="flex justify-between items-center border-b border-white/10 pb-6">
                    <div>
                        <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2">
                            <ArrowLeft size={18} /> Retour au QG
                        </Link>
                        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                            Cortex Connexions
                        </h1>
                    </div>
                    <div className="hidden md:block text-right">
                        <div className="text-sm text-slate-400">Taux de couverture</div>
                        <div className="text-2xl font-bold text-green-400">
                            {Math.min(sources.length * 5, 100)}%
                        </div>
                    </div>
                </div>

                {/* Boucle sur les Catégories */}
                {MODULES.map((module, idx) => (
                    <section key={idx} className="animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${idx * 100}ms` }}>

                        <div className="mb-6 flex items-center gap-4">
                            <div className={`h-8 w-1 bg-gradient-to-b ${module.color} rounded-full`}></div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{module.title}</h2>
                                <p className="text-sm text-slate-400">{module.description}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {module.platforms.map((platform) => {
                                const isConnected = sources.some(s => s.platform === platform.id.toUpperCase());
                                const isSyncing = simulating === platform.id;
                                const Icon = platform.icon;

                                return (
                                    <button
                                        key={platform.id}
                                        onClick={() => !isConnected && handleConnect(platform.id)}
                                        disabled={isConnected || isSyncing}
                                        className={`
                      relative group text-left p-5 rounded-xl border transition-all duration-300 overflow-hidden
                      ${isConnected
                                                ? 'bg-slate-900/80 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                            }
                    `}
                                    >
                                        {/* Badge XP / Privacy */}
                                        <div className="absolute top-3 right-3 flex gap-2">
                                            {platform.private && <Lock size={12} className="text-slate-500" />}
                                            <span className="text-[10px] font-mono opacity-50 bg-black/50 px-1 rounded">
                                                {platform.xp}
                                            </span>
                                        </div>

                                        {/* Icône & Titre */}
                                        <div className={`mb-3 ${isConnected ? 'text-green-400' : 'text-slate-300 group-hover:text-white'}`}>
                                            <Icon size={24} />
                                        </div>
                                        <div className="font-bold text-sm mb-1">{platform.name}</div>

                                        {/* État */}
                                        <div className="text-xs font-mono">
                                            {isConnected ? (
                                                <span className="text-green-500">● ACTIF</span>
                                            ) : isSyncing ? (
                                                <span className="text-purple-400 animate-pulse">↻ SYNC...</span>
                                            ) : (
                                                <span className="text-slate-500">○ DÉCONNECTÉ</span>
                                            )}
                                        </div>

                                        {/* Effet de fond au survol */}
                                        {!isConnected && (
                                            <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))}

            </div>
        </div>
    );
}
