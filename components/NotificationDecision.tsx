'use client';
import { Shield, Check, X, Bell } from 'lucide-react';
import { useState } from 'react';

export default function NotificationDecision({ request, onAction }: { request: any, onAction: (id: string, action: string) => void }) {
    // request contient : topic, match_score, requester_id, id

    const [loading, setLoading] = useState(false);

    const handleAction = (action: string) => {
        setLoading(true);
        onAction(request.id, action);
    };

    return (
        <div className="p-4 bg-slate-900 border border-blue-500/50 rounded-xl shadow-lg mb-4 animate-in fade-in slide-in-from-right-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10 text-blue-500"><Bell size={64} /></div>

            <div className="flex justify-between items-start mb-3 relative z-10">
                <h4 className="font-bold text-blue-400 text-xs uppercase flex items-center gap-2">
                    <Shield size={14} className="animate-pulse" /> Signal de Réseau
                </h4>
                <span className={`text-[10px] font-bold px-2 py-1 rounded border ${request.match_score > 80 ? 'bg-green-900/50 text-green-300 border-green-500' : 'bg-orange-900/50 text-orange-300 border-orange-500'}`}>
                    MATCH : {request.match_score}%
                </span>
            </div>

            <p className="text-xs text-slate-300 mb-4 relative z-10">
                Un clone demande à ouvrir une discussion sur le sujet : <br />
                <span className="font-mono text-white bg-slate-950 px-2 py-1 rounded mt-1 inline-block border border-slate-700">"{request.topic}"</span>
            </p>

            <div className="flex gap-2 relative z-10">
                <button
                    onClick={() => handleAction('approved')}
                    disabled={loading}
                    className="flex-1 bg-green-600/80 hover:bg-green-500 py-2 rounded text-[10px] font-bold transition flex items-center justify-center gap-1 text-white border border-green-500"
                >
                    <Check size={12} /> ACCEPTER
                </button>
                <button
                    onClick={() => handleAction('declined')}
                    disabled={loading}
                    className="flex-1 bg-red-900/80 hover:bg-red-800 py-2 rounded text-[10px] font-bold transition flex items-center justify-center gap-1 text-red-300 border border-red-800"
                >
                    <X size={12} /> REFUSER
                </button>
            </div>
        </div>
    );
}
