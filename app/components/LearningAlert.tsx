"use client";

import React, { useState, useEffect } from "react";
import { BrainCircuit } from "lucide-react";
import { updateIdentity } from "../actions/cortex";

export default function LearningAlert() {
    const [question, setQuestion] = useState<string | null>(null);
    const [field, setField] = useState<'bio' | 'role' | 'tjm' | null>(null);
    const [loading, setLoading] = useState(true);
    const [answer, setAnswer] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        async function fetchGap() {
            try {
                const res = await fetch("/api/cortex/analyze-gaps");
                const data = await res.json();
                if (data.question && data.field) {
                    setQuestion(data.question);
                    setField(data.field);
                }
            } catch (e) {
                console.error("Failed to fetch gap analysis:", e);
            } finally {
                setLoading(false);
            }
        }

        fetchGap();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!answer.trim() || !field) return;

        setIsSubmitting(true);

        const result = await updateIdentity(answer, field);

        if (result?.success) {
            setSuccess(true);
            setTimeout(() => setQuestion(null), 3000); // Disparaît après 3s
        } else {
            console.error("Erreur lors de la mise à jour");
        }
        setIsSubmitting(false);
    };

    if (loading || !question) return null;

    return (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md mb-8 group transition-all">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <BrainCircuit className="w-5 h-5 text-emerald-400 animate-pulse" />
                </div>
                <div className="space-y-2 flex-1">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                        Requête d'Affinement
                    </h4>

                    {success ? (
                        <p className="text-sm text-emerald-400 font-bold leading-relaxed py-2">
                            ✓ Connaissance ingérée avec succès. Le ciblage a été affiné.
                        </p>
                    ) : (
                        <>
                            <p className="text-sm text-white leading-relaxed italic">
                                "{question}"
                            </p>
                            <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
                                <input
                                    type="text"
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder="Répondre à l'agent..."
                                    disabled={isSubmitting}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500/50 disabled:opacity-50 text-white placeholder-gray-500"
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !answer.trim()}
                                    className="px-4 py-2 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? "..." : "Enregistrer"}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
