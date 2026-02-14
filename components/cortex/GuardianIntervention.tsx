'use client';
import { ShieldCheck, CheckCircle, XCircle } from 'lucide-react';

// L'unique fenêtre entre toi et l'autonomie de ton clone
export default function GuardianIntervention({ intervention, onDismiss }: { intervention: any, onDismiss: () => void }) {
    if (!intervention) return null;

    return (
        <div className="border-2 border-cyan-500 bg-cyan-950/40 p-6 rounded-2xl animate-in fade-in slide-in-from-top-4 shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden my-6">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>

            <div className="flex items-center gap-3 mb-4 sticky z-10">
                <ShieldCheck className="text-cyan-400" size={28} />
                <h2 className="text-white font-bold uppercase tracking-widest text-lg">Le Gardien a agi</h2>
            </div>

            <p className="text-cyan-100 text-base mb-6 leading-relaxed font-medium sticky z-10">
                "{intervention.text || intervention}"
            </p>

            <div className="flex gap-4 sticky z-10">
                <button
                    onClick={onDismiss}
                    className="bg-cyan-600 hover:bg-cyan-500 px-6 py-2 rounded-full text-white font-bold transition-all shadow-lg shadow-cyan-900/50 flex items-center gap-2"
                >
                    <CheckCircle size={18} /> VALIDER L'ACTION
                </button>
                <button
                    onClick={onDismiss}
                    className="border border-cyan-600/50 hover:bg-cyan-900/30 px-6 py-2 rounded-full text-cyan-400 transition-all flex items-center gap-2"
                >
                    <XCircle size={18} /> REJETER
                </button>
            </div>
        </div>
    );
}
