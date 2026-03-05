"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, Save, Loader2, Euro, Calendar, Briefcase } from "lucide-react";
import { updateIdentity } from "@/app/actions/profile";
import { useFormStatus } from "react-dom";
import { createClient } from "@/lib/supabaseBrowser";
import { checkProfileExists } from "@/app/actions/auth-guard";
import LogoutButton from "@/app/components/auth/LogoutButton";

// Petit composant pour le bouton de soumission avec état de chargement
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
        >
            {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {pending ? "Enregistrement..." : "Sauvegarder l'ADN"}
        </button>
    );
}

export default function IdentityPage() {
    const router = useRouter();

    // ⚡ ANTIGRAVITY: AuthGuard — Session Fantôme → Éjection
    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: any } }) => {
            if (!user) { router.push('/login'); return; }
            const exists = await checkProfileExists(user.id);
            if (!exists) {
                console.log("⚠️ [AUTH] Session Fantôme détectée sur /profile.");
                await supabase.auth.signOut();
                router.push('/login');
            }
        });
    }, []);

    return (
        <div className="min-h-screen text-white p-4 pb-24 md:p-8">
            <div className="max-w-2xl mx-auto space-y-8">

                <header className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[2rem] text-emerald-400">fingerprint</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black italic tracking-tighter">DOSSIER</h1>
                        <p className="text-xs font-mono text-emerald-500/60 uppercase">Agent Identity Protocol</p>
                    </div>
                </header>

                <form action={updateIdentity} className="space-y-6">
                    {/* Section Statut */}
                    <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-6 backdrop-blur-md">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest border-b border-white/5 pb-4">
                            <span className="material-symbols-outlined text-[1rem]">vital_signs</span> Paramètres Vitaux
                        </div>

                        {/* DOMAINE & RÔLE */}
                        <div className="space-y-2">
                            <label className="text-[10px] text-slate-500 uppercase font-bold">Domaine d'Activité</label>
                            <select
                                name="role"
                                className="w-full p-4 rounded-xl bg-black/40 border border-white/5 focus:border-emerald-500/50 outline-none transition-all appearance-none cursor-pointer text-white font-bold"
                                required
                            >
                                <option value="">Sélectionnez votre domaine...</option>
                                <option value="artisanat">Artisanat</option>
                                <option value="sante">Santé</option>
                                <option value="commerce">Commerce</option>
                                <option value="conseil">Études/Conseil</option>
                                <option value="creation">Création</option>
                                <option value="administration">Administration</option>
                                <option value="industrie">Industrie</option>
                                <option value="autre">Autre</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-slate-500 uppercase font-bold">Titre exact de votre métier</label>
                            <input
                                name="customRole"
                                placeholder="Ex: Plombier chauffagiste, Avocat d'affaires, Infirmière..."
                                className="w-full p-4 rounded-xl bg-black/40 border border-white/5 outline-none focus:border-emerald-500/50 transition-all text-white font-bold"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 uppercase font-bold">TJM Souhaité</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="tjm"
                                        placeholder="Ex: 600"
                                        className="w-full p-4 rounded-xl bg-black/40 border border-white/5 outline-none pr-12 text-emerald-400 font-bold"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€/j</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 uppercase font-bold">Disponibilité</label>
                                <select
                                    name="availability"
                                    className="w-full p-4 rounded-xl bg-black/40 border border-white/5 outline-none font-bold"
                                >
                                    <option value="immediate">Immédiate</option>
                                    <option value="1_month">Sous 1 mois</option>
                                    <option value="3_months">Sous 3 mois</option>
                                    <option value="unavailable">Indisponible</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Section Directives */}
                    <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-6 backdrop-blur-md">
                        <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-widest border-b border-white/5 pb-4">
                            <span className="material-symbols-outlined text-[1rem]">policy</span> Directives de Chasse
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-slate-500 uppercase font-bold">
                                Aspirations & Objectifs (Zone de texte libre)
                            </label>
                            <textarea
                                name="bio"
                                rows={4}
                                placeholder="Ex: Je cherche une opportunité dans une entreprise axée sur le développement durable, avec quelques jours de télétravail..."
                                className="w-full p-4 rounded-xl bg-black/40 border border-white/5 outline-none resize-none focus:border-blue-500/50 transition-all text-sm leading-relaxed"
                            />
                        </div>
                    </section>

                    <SubmitButton />
                </form>

                {/* Le bouton d'éjection à la fin */}
                <LogoutButton />

            </div>
        </div>
    );
}
