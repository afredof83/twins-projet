"use client";

import { useState, useEffect } from 'react';
import { updateIdentity } from '@/app/actions/profile';
import { Loader2, CheckCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Le state local du formulaire
    const [profile, setProfile] = useState({
        role: 'Frontend',
        customRole: '',
        tjm: '',
        availability: 'Immédiate',
        bio: ''
    });

    // Chargement initial des données
    useEffect(() => {
        fetch('/api/profile') // Modifiez /api/profile si nécessaire pour renvoyer aussi les nouveaux champs
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    setProfile({
                        role: data.role || 'Frontend',
                        customRole: data.customRole || '',
                        tjm: data.tjm ? data.tjm.toString() : '',
                        availability: data.availability || 'Immédiate',
                        bio: data.bio || ''
                    });
                }
                setIsLoading(false);
            })
            .catch(() => {
                setIsLoading(false);
            });
    }, []);

    // Soumission via Server Action
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage('');

        const formData = new FormData();
        formData.append('role', profile.role);
        if (profile.role === 'Autre') {
            formData.append('customRole', profile.customRole);
        }
        formData.append('tjm', profile.tjm);
        formData.append('availability', profile.availability);
        formData.append('bio', profile.bio);

        try {
            await updateIdentity(formData);
            setMessage('✅ ADN synchronisé avec succès !');
            setTimeout(() => setMessage(''), 3000); // Disparaît après 3s
        } catch (error) {
            setMessage('❌ Erreur lors de la sauvegarde.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 pb-24">
            <div className="max-w-xl mx-auto space-y-8">

                {/* En-tête de page */}
                <header>
                    <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                        Identité
                    </h1>
                    <p className="text-gray-400 mt-1">Paramétrez l'ADN de votre Jumeau Numérique.</p>
                </header>

                {/* Le Formulaire Glassmorphism */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Rôle Principal */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Rôle Principal</label>
                            <div className="relative">
                                <select
                                    value={profile.role}
                                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                                    className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-colors"
                                >
                                    <option value="Frontend">Développeur Frontend</option>
                                    <option value="Backend">Développeur Backend</option>
                                    <option value="Fullstack">Développeur Fullstack</option>
                                    <option value="DevOps">Ingénieur DevOps / Cloud</option>
                                    <option value="Product">Product Manager / Owner</option>
                                    <option value="Autre">Autre...</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Rôle Personnalisé (Apparaît si "Autre" est sélectionné) */}
                        <AnimatePresence>
                            {profile.role === 'Autre' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-2 overflow-hidden"
                                >
                                    <label className="text-sm font-medium text-emerald-300">Quel est votre rôle précis ?</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Architecte Solution, Data Scientist..."
                                        value={profile.customRole}
                                        onChange={(e) => setProfile({ ...profile, customRole: e.target.value })}
                                        className="w-full bg-white/5 border border-emerald-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 focus:bg-white/10 transition-colors"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Grille : TJM et Disponibilité */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* TJM */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Taux Journalier (TJM)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="500"
                                        value={profile.tjm}
                                        onChange={(e) => setProfile({ ...profile, tjm: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-16 py-3 text-white outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-colors"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none">
                                        € / j
                                    </span>
                                </div>
                            </div>

                            {/* Disponibilité */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Disponibilité</label>
                                <div className="relative">
                                    <select
                                        value={profile.availability}
                                        onChange={(e) => setProfile({ ...profile, availability: e.target.value })}
                                        className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-colors"
                                    >
                                        <option value="Immédiate">Immédiate (ASAP)</option>
                                        <option value="Dans 1 mois">Dans 1 mois</option>
                                        <option value="Dans 3 mois">Dans 3 mois</option>
                                        <option value="Indisponible">En mission (À l'écoute)</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Bio libre */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 flex justify-between">
                                <span>Bio & Objectifs</span>
                                <span className="text-xs text-gray-500 font-normal">Sera lu par l'Agent IA</span>
                            </label>
                            <textarea
                                placeholder="Je recherche principalement des missions de refonte d'architecture serverless. Je suis ouvert au remote à 100%..."
                                value={profile.bio}
                                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                className="w-full min-h-[120px] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none resize-none focus:border-emerald-500/50 focus:bg-white/10 transition-colors"
                            />
                        </div>

                        {/* Action Submit */}
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`
                                relative w-full overflow-hidden rounded-xl font-medium text-white shadow-lg transition-transform duration-300 active:scale-[0.98]
                                ${isSaving ? 'pointer-events-none' : 'hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]'}
                            `}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                            <div className="relative py-4 flex items-center justify-center gap-2">
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Synchronisation en cours...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5 opacity-90" />
                                        <span>Mettre à jour l'ADN</span>
                                    </>
                                )}
                            </div>
                        </button>

                        {/* Message Toast (Inline) */}
                        <AnimatePresence>
                            {message && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className={`text-center text-sm font-medium p-3 rounded-xl border ${message.includes('✅')
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}
                                >
                                    {message}
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </form>
                </div>
            </div>
        </div>
    );
}
