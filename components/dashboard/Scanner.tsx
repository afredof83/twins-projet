import { motion } from "framer-motion";

export default function Scanner({ onScanStart }: { onScanStart: () => void }) {
    return (
        <div className="relative w-full h-auto min-h-[220px] flex flex-col items-center justify-center py-6 rounded-xl border border-cyan-900/30 bg-black/40 backdrop-blur-md overflow-visible">

            {/* Coins tactiques (Décoration) */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500 rounded-br-lg" />

            {/* Animation Radar Centrale */}
            <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
                {/* Cercles concentriques animés */}
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border border-cyan-500/30"
                />
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-full h-full border-t-2 border-cyan-400 rounded-full opacity-80 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                />

                {/* Bouton d'action au centre */}
                <button
                    onClick={onScanStart}
                    className="absolute z-20 w-16 h-16 bg-cyan-950/80 rounded-full flex items-center justify-center border border-cyan-400/50 hover:bg-cyan-900 transition-colors active:scale-95"
                >
                    <span className="sr-only">Lancer le Scan</span>
                    {/* Icône Radar SVG */}
                    <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.59-4.18" />
                    </svg>
                </button>
            </div>

            {/* Texte Signal Détecté (Maintenant sécurisé) */}
            <div className="flex flex-col items-center z-10 space-y-2">
                <p className="text-cyan-400 font-mono text-xs tracking-[0.2em] uppercase">
                    SYSTÈME PRÊT
                </p>
                <h3 className="text-white font-bold text-xl tracking-wider drop-shadow-lg">
                    ANALYSER LE RÉSEAU
                </h3>
            </div>
        </div>
    );
}
