import { ShieldCheck, Crosshair, TrendingUp, Cpu, ChevronRight } from 'lucide-react';

interface Opportunity {
    targetId: string;
    targetName: string;
    matchScore: number;
    reason: string;
    suggestedAction: string;
}

interface StrategicReport {
    globalStatus: string;
    analysisSummary: string;
    opportunities: Opportunity[];
}

interface StrategicListOverlayProps {
    report: StrategicReport;
    onSelect: (opp: Opportunity) => void;
    onClose: () => void;
}

export default function StrategicListOverlay({ report, onSelect, onClose }: StrategicListOverlayProps) {
    const getStatusColor = (status: string) => {
        if (status === 'VERT' || status === 'GREEN') return 'text-emerald-400 border-emerald-500/50';
        if (status === 'ORANGE') return 'text-amber-400 border-amber-500/50';
        return 'text-red-500 border-red-500/50';
    };

    return (
        <div className="absolute inset-x-4 top-20 bottom-24 z-50 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">

            {/* Container Principal */}
            <div className="w-full max-w-md bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-full">

                {/* Header Tactique */}
                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center bg-black/40 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${getStatusColor(report.globalStatus)}`}>
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white tracking-widest">GLOBAL_INTEL</h2>
                            <p className="text-[10px] text-gray-400 font-mono">
                                {report.opportunities.length} VECTEURS IDENTIFIÃ‰S
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[10px] px-3 py-1 rounded border border-white/20 text-gray-400 hover:bg-white/10 transition-colors"
                    >
                        FERMER
                    </button>
                </div>

                {/* Global Summary */}
                <div className="p-4 bg-gradient-to-b from-primary/5 to-transparent border-b border-white/5">
                    <p className="text-xs text-primary font-mono leading-relaxed">
                        <span className="text-accent-amber mr-2">{">>>"} ANALYSE:</span>
                        {report.analysisSummary}
                    </p>
                </div>

                {/* Liste des OpportunitÃ©s */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {report.opportunities.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-xs italic">
                            Aucune opportunitÃ© dÃ©tectÃ©e dans le pÃ©rimÃ¨tre actuel.
                        </div>
                    ) : (
                        report.opportunities.map((opp: any, idx: number) => {
                            // Lecture pare-balles : gÃ¨re toutes les orthographes possibles de Mistral
                            const score = opp.matchScore ?? opp.MatchScore ?? opp.score ?? opp["Match Score"] ?? 0;
                            const reason = opp.reason ?? opp.Reason ?? opp.analyse ?? opp.Analyse ?? "Analyse en cours...";
                            const action = opp.suggestedAction ?? opp.SuggestedAction ?? opp.action ?? opp["Action suggÃ©rÃ©e"] ?? "Aucune action dÃ©finie.";
                            const name = opp.targetName ?? opp.TargetName ?? opp.name ?? opp["Nom"] ?? `Cible #${idx + 1}`;
                            const id = opp.targetId ?? opp.id ?? String(idx);

                            return (
                                <div
                                    key={id}
                                    onClick={() => onSelect({ ...opp, targetId: id, targetName: name, matchScore: score, reason, suggestedAction: action })}
                                    className="group relative p-3 rounded-xl bg-white/5 border border-white/5 hover:border-primary/50 hover:bg-white/10 transition-all cursor-pointer active:scale-[0.98]"
                                >
                                    {/* Visual Connector Line */}
                                    <div className="absolute left-0 top-4 bottom-4 w-1 bg-gradient-to-b from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                                            {name}
                                        </h3>
                                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/30 border border-white/10 ${score > 80 ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400'}`}>
                                            {score}%
                                        </span>
                                    </div>

                                    <p className="text-[11px] text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                                        {reason}
                                    </p>

                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                        <div className="flex items-center gap-1.5 text-[10px] text-accent-amber">
                                            <TrendingUp size={12} />
                                            <span className="uppercase tracking-wider font-bold">Action RecommandÃ©e</span>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />
                                    </div>

                                    <p className="text-[10px] text-gray-500 mt-1 italic pl-4 border-l-2 border-white/5">
                                        "{action}"
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/10 bg-black/40 text-center">
                    <p className="text-[9px] text-gray-600 font-mono">
                        CONFIDENTIAL // EYES ONLY
                    </p>
                </div>
            </div>
        </div>
    );
}
