'use client';

import { ShieldCheck, AlertTriangle, FileText, Activity } from 'lucide-react';

interface GuardianFeedProps {
    interventions: any[];
    profileId: string | null;
    onClear: () => void;
    onRefresh: () => void;
}

export default function GuardianFeed({ interventions, profileId, onClear, onRefresh }: GuardianFeedProps) {

    if (interventions.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4">
                <ShieldCheck size={48} className="opacity-20" />
                <div className="text-center space-y-1">
                    <p className="text-xs font-mono uppercase tracking-widest">SystÃ¨me Nominal</p>
                    <p className="text-[10px] opacity-60">Aucune menace active dÃ©tectÃ©e par le Gardien.</p>
                </div>
                <button
                    onClick={onRefresh}
                    className="px-4 py-1.5 rounded-full border border-slate-800 text-[10px] hover:bg-slate-800 transition-colors"
                >
                    Lancer un scan manuel
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {interventions.map((item, index) => (
                <div
                    key={index}
                    className="bg-black border border-red-900/30 rounded-lg p-3 flex gap-3 animate-in slide-in-from-left duration-300"
                >
                    <div className="mt-1">
                        {item.type === 'CRITICAL' ? (
                            <AlertTriangle className="text-red-500 animate-pulse" size={18} />
                        ) : (
                            <Activity className="text-orange-400" size={18} />
                        )}
                    </div>

                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-slate-200">{item.title || "Intervention SystÃ¨me"}</h4>
                            <span className="text-[9px] font-mono text-slate-600">{new Date().toLocaleTimeString()}</span>
                        </div>

                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            {item.description || "Une anomalie a Ã©tÃ© dÃ©tectÃ©e et isolÃ©e par le protocole de sÃ©curitÃ©."}
                        </p>

                        {/* Actions Contextuelles */}
                        <div className="mt-3 flex gap-2">
                            <button className="px-3 py-1 bg-red-900/20 border border-red-900/50 text-red-400 text-[10px] rounded hover:bg-red-900/40 transition-colors">
                                Supprimer la menace
                            </button>
                            <button className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] rounded hover:bg-slate-700 transition-colors">
                                Ignorer
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            <div className="flex justify-center pt-2">
                <button onClick={onClear} className="text-[10px] text-slate-600 hover:text-slate-400 underline">
                    Effacer l'historique d'audit
                </button>
            </div>
        </div>
    );
}
