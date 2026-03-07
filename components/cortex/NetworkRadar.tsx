'use client';
import { useState } from 'react';
import { Radar, Target, UserPlus, ShieldAlert } from 'lucide-react';
import { getApiUrl } from '@/lib/api-config';
// Server action supprimée — on utilise fetch vers /api/scan-network

export default function NetworkRadar({ profileId }: { profileId: string }) {
    const [isScanning, setIsScanning] = useState(false);
    const [agents, setAgents] = useState<any[]>([]);

    const launchScan = async () => {
        setIsScanning(true);
        // On scanne le secteur "Marine Tech & Fishing" par défaut pour FisherMade
        try {
            const { createClient: createSupabase } = await import('@/lib/supabaseBrowser');
            const supabase = createSupabase();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const data = await fetch(getApiUrl('/api/scan-network'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ userId: profileId, mode: 'basic' })
            }).then(r => r.json());
            if (data && data.targets) {
                setAgents(data.targets);
            }
        } catch (error) {
            console.error(error);
        }
        setIsScanning(false);
    };

    return (
        <div className="mt-6 p-6 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden">
            {/* Effet Radar (Animation CSS) */}
            <div className="absolute top-0 right-0 p-4 opacity-20">
                <Radar size={100} className={isScanning ? "animate-spin text-green-500" : "text-slate-600"} />
            </div>

            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Target className="text-red-500" /> RADAR D'OPPORTUNITÉS
            </h2>

            <p className="text-xs text-slate-400 mb-4">
                Détecte les entités (concurrents, partenaires, investisseurs) actives dans votre secteur et évalue leur compatibilité.
            </p>

            <div className="mb-6">
                <button
                    onClick={launchScan}
                    disabled={isScanning}
                    className={`w-full py-3 rounded-lg font-bold tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${isScanning
                        ? 'bg-slate-800 text-slate-500 cursor-wait'
                        : 'bg-red-900/40 border border-red-600 hover:bg-red-800 text-red-100 shadow-red-900/20'
                        }`}
                >
                    <Radar size={16} className={isScanning ? "animate-spin" : ""} />
                    {isScanning ? 'SCAN DU SECTEUR EN COURS...' : 'LANCER LE SONAR ACTIF'}
                </button>
            </div>

            <div className="space-y-3">
                {agents.map((agent, i) => (
                    <div key={i} className="bg-slate-950/80 border border-slate-700 p-4 rounded-lg flex justify-between items-center animate-in slide-in-from-bottom-2 fade-in">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-200">{agent.name}</h3>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${agent.type === 'Partner' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                                    agent.type === 'Competitor' ? 'bg-orange-900/30 text-orange-400 border-orange-800' :
                                        'bg-slate-800 text-slate-400 border-slate-700'
                                    }`}>{agent.type}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 max-w-md">{agent.reasoning}</p>
                        </div>

                        <div className="text-right flex flex-col items-end">
                            <div className="text-2xl font-bold text-green-400">{agent.matchScore}%</div>
                            <div className="text-[10px] uppercase text-green-600 font-bold">Compatibilité</div>
                        </div>
                    </div>
                ))}

                {agents.length === 0 && !isScanning && (
                    <div className="text-center py-8 opacity-50">
                        <ShieldAlert className="mx-auto mb-2 text-slate-600" size={32} />
                        <p className="text-slate-500 text-sm italic">Aucune cible détectée. Lancez le scan pour activer le sonar.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
