"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Save, Loader2, Euro, Calendar, Briefcase } from "lucide-react";
import { updateIdentity } from "@/app/actions/profile";
import { useFormStatus } from "react-dom";

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
  const [role, setRole] = useState("");

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-24 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">

        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-400 flex items-center gap-3">
            <User className="w-8 h-8" /> Identité
          </h1>
          <p className="text-gray-400">Configurez les paramètres profonds de votre Jumeau.</p>
        </header>

        <form action={updateIdentity} className="space-y-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl space-y-6">

            {/* SÉLECTEUR DE RÔLE */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                Rôle Principal
              </label>
              <select
                name="role"
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-4 rounded-xl bg-black/40 border border-white/10 focus:border-emerald-500/50 outline-none transition-all appearance-none cursor-pointer"
                required
              >
                <option value="">Sélectionnez votre expertise...</option>
                <option value="frontend">Développeur Frontend</option>
                <option value="backend">Développeur Backend</option>
                <option value="fullstack">Développeur Fullstack</option>
                <option value="devops">DevOps / Cloud</option>
                <option value="product">Product Manager</option>
                <option value="design">UI/UX Designer</option>
                <option value="autre">Autre (préciser)</option>
              </select>
            </div>

            {/* CHAMP CONDITIONNEL "AUTRE" */}
            <AnimatePresence>
              {role === "autre" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <input
                    name="customRole"
                    placeholder="Quel est votre métier exact ?"
                    className="w-full p-4 rounded-xl bg-black/40 border border-emerald-500/30 outline-none"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* TJM */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Euro className="w-4 h-4" /> TJM Souhaité
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="tjm"
                    placeholder="Ex: 600"
                    className="w-full p-4 rounded-xl bg-black/40 border border-white/10 outline-none pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€/j</span>
                </div>
              </div>

              {/* DISPONIBILITÉ */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Disponibilité
                </label>
                <select
                  name="availability"
                  className="w-full p-4 rounded-xl bg-black/40 border border-white/10 outline-none"
                >
                  <option value="immediate">Immédiate</option>
                  <option value="1_month">Sous 1 mois</option>
                  <option value="3_months">Sous 3 mois</option>
                  <option value="unavailable">Indisponible</option>
                </select>
              </div>
            </div>

            {/* BIO / OBJECTIFS */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">
                Aspirations & Objectifs (Ce que votre Agent doit chercher)
              </label>
              <textarea
                name="bio"
                rows={4}
                placeholder="Ex: Je cherche des projets en architecture Microservices, avec une préférence pour le télétravail complet..."
                className="w-full p-4 rounded-xl bg-black/40 border border-white/10 outline-none resize-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}