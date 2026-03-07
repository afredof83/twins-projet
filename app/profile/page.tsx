'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Loader2, User, MapPin, Briefcase, Heart, Palette } from 'lucide-react';
import { getApiUrl } from '@/lib/api-config';

function ProfileContent() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        try {
            const { createClient } = await import('@/lib/supabaseBrowser');
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const headers: any = { 'Content-Type': 'application/json' };
            headers['Authorization'] = `Bearer ${session.access_token}`;

            const res = await fetch(getApiUrl(`/api/profile?id=${session.user.id}`), { headers });
            const data = await res.json();

            if (data.success) {
                setProfile(data.profile);
            }
        } catch (e) {
            console.error("fetchData error", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        const fd = new FormData(e.currentTarget);

        try {
            const { createClient } = await import("@/lib/supabaseBrowser");
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            const headers: any = { 'Content-Type': 'application/json' };
            if (session) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            await fetch(getApiUrl('/api/profile'), {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    action: 'updateGeneralIdentity',
                    name: fd.get('name'),
                    age: fd.get('age'),
                    gender: fd.get('gender'),
                    city: fd.get('city'),
                    country: fd.get('country')
                })
            });
            // Petit feedback visuel rapide
            setTimeout(() => setSaving(false), 500);
        } catch (error) {
            console.error("Erreur de sauvegarde", error);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-mono">
                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                INITIALISATION IPSE...
            </div>
        );
    }

    // Génération des âges de 18 à 99
    const ageOptions = Array.from({ length: 82 }, (_, i) => i + 18);

    return (
        <div className="min-h-screen text-white p-4 pb-24 md:p-8 bg-slate-950">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* HEADER */}
                <header>
                    <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-flex items-center gap-2">
                        ← Retour au Radar
                    </Link>
                    <h1 className="text-3xl font-black italic tracking-tighter text-blue-400 flex items-center gap-3 mt-4">
                        <User className="w-8 h-8" /> NOYAU D'IDENTITÉ
                    </h1>
                    <p className="text-slate-500 text-sm font-mono uppercase tracking-widest mt-1">
                        Configuration de l'Agent Ipse
                    </p>
                </header>

                {/* FORMULAIRE G0 (Général) */}
                <div className="p-1 bg-gradient-to-b from-blue-500/20 to-transparent rounded-3xl">
                    <div className="bg-slate-950/90 rounded-[1.4rem] p-6 backdrop-blur-xl border border-blue-500/10">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Pseudo / Prénom</label>
                                    <input
                                        type="text"
                                        name="name"
                                        defaultValue={profile?.name || ''}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                        placeholder="Comment Ipse doit-il vous appeler ?"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Âge</label>
                                        <select
                                            name="age"
                                            defaultValue={profile?.age || ''}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                                        >
                                            <option value="">Sélectionner</option>
                                            {ageOptions.map(age => (
                                                <option key={age} value={age}>{age} ans</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Sexe</label>
                                        <select
                                            name="gender"
                                            defaultValue={profile?.gender || ''}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                                        >
                                            <option value="">Sélectionner</option>
                                            <option value="Homme">Homme</option>
                                            <option value="Femme">Femme</option>
                                            <option value="Autre">Autre</option>
                                            <option value="Non précisé">Je préfère ne pas le dire</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <MapPin className="w-3 h-3" /> Ville
                                        </label>
                                        <input
                                            type="text"
                                            name="city"
                                            defaultValue={profile?.city || ''}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                            placeholder="Ex: Paris"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Pays</label>
                                        <select
                                            name="country"
                                            defaultValue={profile?.country || ''}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                                        >
                                            <option value="">Sélectionner</option>
                                            <option value="France">France</option>
                                            <option value="Suisse">Suisse</option>
                                            <option value="Belgique">Belgique</option>
                                            <option value="Canada">Canada</option>
                                            <option value="Autre">Autre</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "METTRE À JOUR LE NOYAU"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* PRISMES THÉMATIQUES */}
                <div className="pt-6 border-t border-slate-800">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mb-6 text-center">
                        Prismes Spécialisés
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Bouton Travail */}
                        <button onClick={() => alert("Module Travail : Bientôt disponible pour configurer le TJM, le rôle et les compétences de l'Agent.")} className="group relative p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all text-left overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                            <Briefcase className="w-8 h-8 text-blue-400 mb-4" />
                            <h3 className="text-lg font-bold text-white mb-1">Travail</h3>
                            <p className="text-xs text-slate-500">Compétences, TJM, Objectifs</p>
                        </button>

                        {/* Bouton Rencontre */}
                        <button onClick={() => alert("Module Rencontre : Bientôt disponible pour affiner les intérêts et attentes.")} className="group relative p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-pink-500/50 transition-all text-left overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                            <Heart className="w-8 h-8 text-pink-400 mb-4" />
                            <h3 className="text-lg font-bold text-white mb-1">Rencontre</h3>
                            <p className="text-xs text-slate-500">Intérêts, Attentes, Lifestyle</p>
                        </button>

                        {/* Bouton Hobbie */}
                        <button onClick={() => alert("Module Hobbie : Bientôt disponible pour cataloguer les passions et projets.")} className="group relative p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all text-left overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                            <Palette className="w-8 h-8 text-emerald-400 mb-4" />
                            <h3 className="text-lg font-bold text-white mb-1">Hobbie</h3>
                            <p className="text-xs text-slate-500">Passions, Projets perso</p>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
            <ProfileContent />
        </Suspense>
    );
}