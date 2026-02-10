'use client';
import { useState } from 'react';
import { Zap } from 'lucide-react';

export default function SocialBridge({ profileId, onSyncComplete }: any) {
    const [loading, setLoading] = useState(false);

    const handleSync = async () => {
        setLoading(true);
        // Simulation appel API RSS
        await new Promise(r => setTimeout(r, 1500));
        setLoading(false);
        if (onSyncComplete) onSyncComplete();
    };

    return (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
            <div>
                <h4 className="text-xs font-bold text-cyan-400">PONT SOCIAL</h4>
                <p className="text-[10px] text-slate-500">Synchronisation Flux & Compétences</p>
            </div>
            <button onClick={handleSync} disabled={loading} className={`p-2 rounded-lg border transition-all ${loading ? 'bg-cyan-900 text-white animate-spin' : 'bg-slate-800 text-cyan-500 border-slate-600 hover:border-cyan-400'}`}>
                <Zap size={18} />
            </button>
        </div>
    );
}
