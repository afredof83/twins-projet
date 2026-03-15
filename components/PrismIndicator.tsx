'use client';

import React from 'react';
import { usePrismStore, PrismType } from '@/store/prismStore';
import { motion, AnimatePresence } from 'framer-motion';

const PRISMS: PrismType[] = ['WORK', 'HOBBY', 'DATING'];

const THEMES = {
    WORK: { color: 'bg-blue-500', label: 'WORK', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.5)]' },
    HOBBY: { color: 'bg-emerald-500', label: 'HOBBY', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.5)]' },
    DATING: { color: 'bg-pink-500', label: 'DATING', glow: 'shadow-[0_0_12px_rgba(236,72,153,0.5)]' },
};

export default function PrismIndicator() {
    const { currentPrism, setPrism } = usePrismStore();

    return (
        <div className="flex items-center justify-center gap-2 py-4">
            {PRISMS.map((prism) => {
                const isActive = currentPrism === prism;
                return (
                    <button
                        key={prism}
                        onClick={() => setPrism(prism)}
                        className="relative flex flex-col items-center justify-center w-11 h-11 group transition-all outline-none"
                        aria-label={`Switch to ${prism} prism`}
                    >
                        {/* Background Dot / Track */}
                        <div className={`
                            h-1 rounded-full transition-all duration-500 ease-in-out
                            ${isActive ? 'w-6 opacity-0' : 'w-1 bg-white/20 group-hover:bg-white/40'}
                        `} />

                        {/* Label */}
                        <span className={`
                            absolute -bottom-1 text-[7px] font-black tracking-[0.2em] transition-all duration-300
                            ${isActive ? 'text-white opacity-100' : 'text-white/20 opacity-0 group-hover:opacity-40'}
                        `}>
                            {THEMES[prism].label}
                        </span>

                        {/* Active Indicator with Smooth Layout Transition */}
                        {isActive && (
                            <motion.div
                                layoutId="prism-active-pill"
                                className={`
                                    absolute h-1 rounded-full ${THEMES[prism].color} ${THEMES[prism].glow}
                                `}
                                initial={false}
                                animate={{ width: 24 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 30
                                }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
