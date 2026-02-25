import { motion } from "framer-motion";

export default function Scanner({ onScanStart }: { onScanStart: () => void }) {
    return (
        <div className="glass-panel rounded-xl p-1 relative overflow-visible flex flex-col items-center justify-center group min-h-[250px] shadow-2xl mt-4">
            <div className="relative w-full h-auto min-h-[220px] flex flex-col items-center justify-center py-6 rounded-lg border border-white/5 bg-black/20 overflow-visible">

                {/* Le bouton central de scan */}
                <div className="relative w-full flex items-center justify-center mb-2 z-20">
                    <button
                        onClick={onScanStart}
                        className="z-30 w-16 h-16 bg-cyan-950/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-cyan-400/50 hover:bg-cyan-900 transition-colors active:scale-95 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                    >
                        <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.59-4.18"></path>
                        </svg>
                    </button>
                </div>

                <div className="flex flex-col items-center z-10 space-y-2">
                    <p className="text-cyan-400 font-mono text-[10px] tracking-[0.2em] uppercase">SYSTÈME PRÊT</p>
                    <h3 className="text-white font-bold text-lg tracking-widest drop-shadow-lg uppercase">Analyser le Réseau</h3>
                </div>
            </div>
        </div>
    );
}
