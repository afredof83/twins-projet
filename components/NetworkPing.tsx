import { useMemo } from 'react';
import { Send, X, MessageSquare, Shield } from 'lucide-react';

interface NetworkPingProps {
    request: {
        id: string;
        match_score: number;
        topic: string;
        requester_id: string;
    } | null;
    onAccept: (request: any) => void;
    onDecline: (id: string) => void;
}

export default function NetworkPing({ request, onAccept, onDecline }: NetworkPingProps) {
    if (!request) return null;

    const matchPercentage = request.match_score;
    const scoreColor = matchPercentage > 80 ? 'text-green-400' : 'text-yellow-400';
    const scoreBg = matchPercentage > 80 ? 'bg-green-900/30 border-green-500/50' : 'bg-yellow-900/30 border-yellow-500/50';

    return (
        <div className="bg-slate-900/90 backdrop-blur-sm border-l-4 border-blue-500 p-4 rounded-r-lg shadow-lg mb-4 flex items-center justify-between animate-in slide-in-from-top-4 duration-500 ring-1 ring-blue-500/20">
            <div className="flex-1 pr-4">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                        <Shield size={12} className="text-blue-500 animate-pulse" />
                        Requête Inter-Clones
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${scoreBg} ${scoreColor}`}>
                        [{matchPercentage}% MATCH]
                    </span>
                </div>
                <p className="text-slate-200 text-sm leading-tight">
                    Sujet détecté : <span className="font-bold text-white">"{request.topic}"</span>
                </p>
            </div>

            <div className="flex gap-3 items-center">
                <button
                    onClick={() => onDecline(request.id)}
                    className="text-slate-500 hover:text-red-400 text-[10px] font-bold transition-colors uppercase tracking-wider flex items-center gap-1"
                >
                    <X size={12} /> Ignorer
                </button>
                <button
                    onClick={() => onAccept(request)}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded text-xs font-bold transition-all shadow-md hover:shadow-green-500/20 flex items-center gap-2 group animate-pulse"
                >
                    ✅ ACCEPTER
                </button>
            </div>
        </div>
    );
}
