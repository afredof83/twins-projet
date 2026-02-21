export default function AuditReport({ data, onAction }: any) {
    return (
        <div className="bg-black/95 border-t border-cyan-500/50 fixed inset-0 z-50 mt-20 flex flex-col p-6 overflow-y-auto animate-fade-in">
            <h2 className="text-cyan-400 font-mono text-xs tracking-widest mb-4">RAPPORT D'INTELLIGENCE_IA</h2>

            <div className="space-y-6 flex-1">
                <section>
                    <h3 className="text-white font-bold mb-2">OpportunitÃ©s DÃ©tectÃ©es</h3>
                    <ul className="text-sm text-slate-300 list-disc pl-4 space-y-1">
                        {data.opportunities && data.opportunities.map((opp: string, i: number) => (
                            <li key={i}>{opp}</li>
                        ))}
                        {!data.opportunities && (
                            <>
                                <li>Potentiel partenaire technique (React/Node)</li>
                                <li>IntÃ©rÃªt commun: Cyber-sÃ©curitÃ©</li>
                                <li>Localisation compatible</li>
                            </>
                        )}
                    </ul>
                </section>

                <section>
                    <h3 className="text-white font-bold mb-2">Risques / Divergences</h3>
                    <p className="text-sm text-slate-400">Aucune divergence critique dÃ©tectÃ©e. Profil stable.</p>
                </section>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-white/10">
                <button onClick={() => onAction('CANCEL')} className="py-3 text-slate-400 text-xs font-bold bg-slate-900 rounded border border-slate-700">
                    ANNULER
                </button>
                <button onClick={() => onAction('BLOCK')} className="py-3 text-red-400 text-xs font-bold bg-red-950/30 rounded border border-red-900/50">
                    BLOQUER
                </button>
                <button onClick={() => onAction('LINK')} className="py-3 text-black text-xs font-bold bg-green-400 rounded shadow-lg shadow-green-400/20">
                    LIAISON
                </button>
            </div>
        </div>
    );
}
