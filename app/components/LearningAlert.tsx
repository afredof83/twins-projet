"use client";

import React, { useState } from "react";
import { BrainCircuit } from "lucide-react";
import { useCortexGaps } from "@/app/hooks/useCortexGaps";
import { getApiUrl } from "@/lib/api-config";

export default function LearningAlert() {
    const { gaps, isLoading, mutate } = useCortexGaps();
    const [answer, setAnswer] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    if (isLoading || !gaps?.question) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!answer.trim() || !gaps.field) return;

        setIsSubmitting(true);

        try {
            const { createClient } = await import('@/lib/supabaseBrowser');
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const response = await fetch(getApiUrl('/api/cortex'), {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: 'updateIdentity',
                    answer: answer,
                    field: gaps.field
                })
            });

            const result = await response.json();

            if (result?.success) {
                setSuccess(true);
                // On dit à SWR de rafraîchir la donnée (re-fetch pour voir s'il y a un autre gap)
                mutate();
                setTimeout(() => setSuccess(false), 3000); // Disparaît après 3s
            } else {
                console.error("Erreur lors de la mise à jour:", result?.error);
            }
        } catch (err) {
            console.error("Erreur critique:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

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
                                "{gaps.question}"
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
