export default function MatchOverlay({ data, onAudit, onCancel }: any) {
    return (
        <div className="bg-slate-900/90 border border-cyan-500/50 rounded-2xl p-6 backdrop-blur-xl animate-slide-up">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-700 rounded-full overflow-hidden border-2 border-green-400">
                    {/* Placeholder image  - user specified "Using modern typography... placeholder... use your generate_image tool..." but for now this is code provided by user */}
                    <div className="w-full h-full bg-gray-600 animate-pulse" />
                </div>
                <div>
                    <h2 className="text-white text-xl font-bold">{data.name}</h2>
                    <p className="text-green-400 font-mono text-sm">COMPATIBILITÉ: {data.score}%</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button onClick={onCancel} className="py-3 text-slate-400 font-bold uppercase text-sm bg-slate-800 rounded-lg">
                    Ignorer
                </button>
                <button onClick={onAudit} className="py-3 text-black font-bold uppercase text-sm bg-cyan-400 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                    Audit Profond
                </button>
            </div>
        </div>
    );
}
