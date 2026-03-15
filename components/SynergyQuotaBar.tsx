'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface QuotaProps {
  remaining: number;
  max: number;
  resetMinutes: number;
  prism: 'WORK' | 'HOBBY' | 'DATING';
}

/**
 * SynergyQuotaBar - Visual indicator for AI call limits
 * Uses framer-motion for smooth progress updates.
 */
export const SynergyQuotaBar = ({ remaining, max, resetMinutes, prism }: QuotaProps) => {
  const percentage = Math.max(0, Math.min(100, (remaining / max) * 100));
  
  const colors = {
    WORK: 'bg-blue-500',
    HOBBY: 'bg-emerald-500',
    DATING: 'bg-pink-500'
  };

  return (
    <div className="w-full space-y-2 p-4 bg-black/20 rounded-xl border border-white/10 backdrop-blur-md">
      <div className="flex justify-between text-xs font-mono uppercase tracking-widest text-white/60">
        <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${colors[prism]} animate-pulse`} />
            Énergie IA : {remaining}/{max}
        </span>
        {remaining === 0 && (
          <span className="text-orange-400 animate-pulse">Recharge dans {resetMinutes}m</span>
        )}
      </div>
      
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${colors[prism]} shadow-[0_0_10px_rgba(255,255,255,0.3)]`}
        />
      </div>
    </div>
  );
};
