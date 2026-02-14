'use client';
import { useState } from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';

export default function GuardianLoop({ profileId }: { profileId: string }) {
    const [activeNegotiations, setNegotiations] = useState<any[]>([]);
    const [isNegotiating, setIsNegotiating] = useState(false);

    // Simulation d'une détection et négociation automatique
    const startAutonomousSync = async () => {
        setIsNegotiating(true);
        // Pour la démo, on simule un Target ID. Dans la vraie vie, on le prendrait du NetworkRadar.
        // On va utiliser un ID fictif ou celui d'un autre profil existant si connu.
        // Ici on laisse l'API gérer l'absence ou simuler si besoin, ou on passe un ID fictif.
        const fakeTargetId = "partner-profile-id-placeholder";

        try {
            const res = await fetch('/api/network/negotiate', {
                method: 'POST',
                body: JSON.stringify({ myProfileId: profileId, targetProfileId: fakeTargetId }),
            });

            if (res.ok) {
                const data = await res.json();
                setNegotiations(prev => [data, ...prev]);
            } else {
                // Si l'API renvoie 404 car pas de profil, on simule une réponse pour la démo UI
                setNegotiations(prev => [{
                    summary: "Simulation : Le Gardien de Rapala est intrigué par vos brevets sur l'acier tungstène.",
                    verdict: "MATCH",
                    nextStep: "Proposer un NDA avant d'envoyer les plans."
                }, ...prev]);
            }
        } catch (e) {
            console.error("Erreur negociation", e);
        } finally {
            setIsNegotiating(false);
        }
    };

    return (
        <div className="bg-black/40 border border-cyan-900/50 rounded-2xl p-6 backdrop-blur-xl mb-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-cyan-400 font-bold flex items-center gap-2 tracking-tighter italic">
                    <ShieldCheck size={20} className="animate-pulse" /> BOUCLE DU GARDIEN ACTIF
                </h2>
                <span className="text-[10px] bg-cyan-900/30 text-cyan-500 px-2 py-1 rounded border border-cyan-500/30 uppercase tracking-widest">
                    Autonome
                </span>
            </div>

            <div className="space-y-4">
                {activeNegotiations.length === 0 ? (
                    <div className="text-slate-600 text-sm italic text-center py-10">
                        "Je scanne le réseau. Je te préviendrai dès que je trouve un clone digne de ton attention."
                    </div>
                ) : (
                    activeNegotiations.map((neg, i) => (
                        <div key={i} className="bg-slate-900/50 border-l-2 border-cyan-500 p-4 rounded-r-lg animate-in fade-in slide-in-from-right-4">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-white flex items-center gap-2">
                                    <UserCheck size={14} className="text-cyan-400" /> Match trouvé avec le Fabricant
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${neg.verdict === 'MATCH' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                                    {neg.verdict}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 italic mb-3">"{neg.summary}"</p>
                            <div className="bg-cyan-950/20 p-2 rounded border border-cyan-500/20">
                                <p className="text-[11px] text-cyan-300 font-bold uppercase tracking-widest">Conseil du Gardien :</p>
                                <p className="text-xs text-white mt-1">{neg.nextStep}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Bouton pour tester le déclenchement (En attendant le Cron Job automatique) */}
            <button
                onClick={startAutonomousSync}
                disabled={isNegotiating}
                className="mt-6 w-full py-2 border border-cyan-500/50 text-cyan-400 text-[10px] uppercase font-bold hover:bg-cyan-500/10 transition-all rounded-lg flex justify-center items-center gap-2"
            >
                {isNegotiating ? 'NÉGOCIATION EN COURS...' : 'SIMULER UNE RENCONTRE DE CLONES'}
            </button>
        </div>
    );
}
