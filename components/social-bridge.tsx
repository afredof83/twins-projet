'use client';
import { useState } from 'react';
import { Twitter, Linkedin, Instagram, Globe, Sparkles, Check, BrainCircuit, ShieldAlert, Lock, Hand } from 'lucide-react';

interface SocialBridgeProps {
    profileId: string;
    onSyncComplete: () => void;
}

export default function SocialBridge({ profileId, onSyncComplete }: SocialBridgeProps) {
    const [activeNetwork, setActiveNetwork] = useState<string | null>(null);
    const [inputData, setInputData] = useState('');
    const [isCertified, setIsCertified] = useState(false);
    const [step, setStep] = useState<'CHOICE' | 'INPUT' | 'PROCESSING' | 'SUCCESS'>('CHOICE');

    const networks = [
        { id: 'linkedin', icon: Linkedin, color: 'text-blue-500', bg: 'hover:bg-blue-900/20', border: 'hover:border-blue-500', label: 'LinkedIn', desc: 'CV & Carrière' },
        { id: 'twitter', icon: Twitter, color: 'text-sky-400', bg: 'hover:bg-sky-900/20', border: 'hover:border-sky-500', label: 'X / Twitter', desc: 'Opinions & News' },
        { id: 'instagram', icon: Instagram, color: 'text-pink-500', bg: 'hover:bg-pink-900/20', border: 'hover:border-pink-500', label: 'Instagram', desc: 'Lifestyle & Passions' },
        { id: 'web', icon: Globe, color: 'text-emerald-400', bg: 'hover:bg-emerald-900/20', border: 'hover:border-emerald-500', label: 'Blog / Web', desc: 'Articles & Bios' },
    ];

    const handleNetworkSelect = (id: string) => {
        setActiveNetwork(id);
        setStep('INPUT');
        setIsCertified(false);
    };

    const handleSimulateAnalysis = async () => {
        if (!inputData.trim() || !isCertified) return;

        setStep('PROCESSING');
        await new Promise(r => setTimeout(r, 1200));

        try {
            await fetch('/api/memories/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: inputData,
                    type: 'document',
                    source: `${activeNetwork}_manual_unverified`,
                    profileId
                })
            });

            setStep('SUCCESS');
            setTimeout(() => {
                onSyncComplete();
                setStep('CHOICE');
                setInputData('');
                setActiveNetwork(null);
                setIsCertified(false);
            }, 2000);

        } catch (e) {
            setStep('INPUT');
            alert("Erreur critique.");
        }
    };

    return (
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group h-full flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-[50px] rounded-full pointer-events-none"></div>

            {/* EN-TÊTE */}
            <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="text-slate-300 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <BrainCircuit size={16} className="text-purple-400" /> Apprentissage Externe
                </h3>
                {step !== 'CHOICE' && (
                    <button onClick={() => setStep('CHOICE')} className="text-xs text-slate-500 hover:text-white transition-colors">ANNULER</button>
                )}
            </div>

            {/* CORPS DU MODULE (Flex grow pour remplir l'espace) */}
            <div className="flex-1 flex flex-col justify-center">

                {/* ÉTAPE 1 : CHOIX */}
                {step === 'CHOICE' && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {networks.map((net) => {
                            const Icon = net.icon;
                            return (
                                <button key={net.id} onClick={() => handleNetworkSelect(net.id)} className={`p-4 rounded-xl border border-slate-700 bg-slate-800/50 text-left transition-all duration-300 ${net.bg} ${net.border} group/btn`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-2 rounded-lg bg-slate-900 ${net.color}`}><Icon size={20} /></div>
                                        <span className="font-bold text-slate-200 text-sm">{net.label}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 group-hover/btn:text-slate-300 pl-1">{net.desc}</div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ÉTAPE 2 : SAISIE SÉCURISÉE */}
                {step === 'INPUT' && (
                    <div className="animate-in zoom-in-95 duration-300 flex flex-col h-full">
                        <div className="bg-black/40 border border-slate-700 rounded-xl p-3 mb-3 flex-1">
                            <p className="text-xs text-purple-300 mb-2 font-mono flex items-center gap-2"><Sparkles size={12} /> INSTRUCTION :</p>
                            <textarea
                                value={inputData}
                                onChange={(e) => setInputData(e.target.value)}
                                className="w-full bg-transparent border-none text-sm text-white h-full focus:outline-none placeholder-slate-600 font-mono resize-none"
                                placeholder={`Collez ici le texte de votre profil ${activeNetwork}...`}
                                autoFocus
                            />
                        </div>

                        {/* ZONE DE SÉCURITÉ XXL (Tout est cliquable) */}
                        <label
                            className={`
                    cursor-pointer rounded-xl p-4 mb-3 border transition-all duration-300 flex gap-4 items-center group
                    ${isCertified
                                    ? 'bg-green-900/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                    : 'bg-red-900/10 border-red-900/50 hover:bg-red-900/20 hover:border-red-500'
                                }
                `}
                        >
                            <input type="checkbox" className="hidden" checked={isCertified} onChange={(e) => setIsCertified(e.target.checked)} />

                            {/* CASE À COCHER */}
                            <div className={`
                    w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors
                    ${isCertified ? 'bg-green-500 border-green-500' : 'border-slate-500 group-hover:border-red-400 bg-black/50'}
                `}>
                                {isCertified && <Check size={20} className="text-black font-bold" />}
                            </div>

                            {/* TEXTE */}
                            <div className="flex-1">
                                <p className={`text-xs font-bold uppercase mb-1 ${isCertified ? 'text-green-400' : 'text-red-400'}`}>
                                    {isCertified ? 'Protocole Validé' : 'Certification Requise'}
                                </p>
                                <p className={`text-xs leading-tight ${isCertified ? 'text-green-100' : 'text-slate-400'}`}>
                                    Je certifie sur l'honneur être le propriétaire de ces données.
                                </p>
                            </div>
                        </label>

                        <button
                            onClick={handleSimulateAnalysis}
                            disabled={!inputData.trim() || !isCertified}
                            className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${inputData.trim() && isCertified
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] transform hover:scale-[1.02]'
                                    : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                                }`}
                        >
                            {!isCertified && <Lock size={16} />}
                            {isCertified ? 'LANCER L\'ASSIMILATION' : 'VERROUILLÉ'}
                        </button>
                    </div>
                )}

                {/* ÉTAPE 3 : TRAITEMENT */}
                {step === 'PROCESSING' && (
                    <div className="text-center py-8 animate-pulse">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-t-purple-500 border-slate-800 animate-spin"></div>
                        <h4 className="text-purple-400 font-bold text-sm mb-1">ENCODAGE NEURONAL...</h4>
                        <p className="text-xs text-slate-500 font-mono">Conversion des données brutes...</p>
                    </div>
                )}

                {/* ÉTAPE 4 : SUCCÈS */}
                {step === 'SUCCESS' && (
                    <div className="text-center py-8 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center border-2 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]"><Check size={40} /></div>
                        <h4 className="text-white font-bold text-lg mb-1">MÉMOIRE INTÉGRÉE</h4>
                        <p className="text-xs text-slate-400">Le jumeau a assimilé vos connaissances.</p>
                    </div>
                )}

            </div>
        </div>
    );
}