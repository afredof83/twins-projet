'use client'

import { useState } from 'react';
import { executeTerminalCommand } from '@/app/actions/terminal-command';
import { TargetNode } from '@/components/TacticalGlobe';

export function CommandTerminal({ userId, onTargetsFound }: { userId: string, onTargetsFound?: (targets: TargetNode[]) => void }) {
    const [command, setCommand] = useState('');
    const [history, setHistory] = useState<{ role: 'user' | 'agent', text: string }[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleCommand = async () => {
        if (!command.trim()) return;

        // Afficher la commande de l'utilisateur
        const currentCmd = command;
        setHistory(prev => [...prev, { role: 'user', text: currentCmd }]);
        setCommand('');
        setIsProcessing(true);

        try {
            const result = await executeTerminalCommand(userId, currentCmd);
            if (result.success && result.answer) {
                const textAnswer = typeof result.answer === 'string' ? result.answer : JSON.stringify(result.answer);
                setHistory(prev => [...prev, { role: 'agent', text: textAnswer }]);

                // NOUVEAU: On passe les cibles trouvées au parent (le Dashboard)
                if (result.targets && onTargetsFound) {
                    onTargetsFound(result.targets);
                }
            } else {
                setHistory(prev => [...prev, { role: 'agent', text: "[ERREUR] Liaison IA perdue." }]);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        // Utilisation de TA classe glass-panel pour une transparence unifiée
        <div className="glass-panel rounded-xl flex flex-col h-[500px] font-mono text-sm overflow-hidden shadow-2xl">

            {/* HEADER TERMINAL - Aligné sur le style de tes Channels */}
            <div className="flex items-center justify-between border-b border-white/10 p-4 mx-2">
                <h3 className="text-xs text-cyan-500 font-bold tracking-widest flex items-center gap-2">
                    <span className="animate-pulse">☄️</span> TWINS_OS // TERMINAL
                </h3>
                <span className="text-[10px] flex items-center gap-2 text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> RADAR EN LIGNE
                </span>
            </div>

            {/* ZONE DE CHAT / LOGS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-gray-300 custom-scrollbar">
                <div className="text-cyan-600/50 text-xs italic">Système initialisé. En attente d'ordres tactiques...</div>

                {history.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <span className={`text-[9px] tracking-wider mb-1 uppercase ${msg.role === 'user' ? 'text-gray-500' : 'text-cyan-500'}`}>
                            {msg.role === 'user' ? 'VOUS' : 'CORTEX'}
                        </span>
                        <div className={`p-3 rounded-xl max-w-[85%] text-sm ${msg.role === 'user'
                            ? 'bg-black/40 border border-white/5 text-gray-200' // Message user discret
                            : 'bg-cyan-900/10 border border-cyan-500/20 text-cyan-100 whitespace-pre-wrap backdrop-blur-sm' // Message IA vitré
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isProcessing && (
                    <div className="text-cyan-500 text-xs animate-pulse">&gt; Scan réseau et Web en cours...</div>
                )}
            </div>

            {/* ZONE DE SAISIE */}
            <div className="p-3 mx-4 mb-2 border-t border-white/10 bg-transparent flex gap-3 items-center">
                <span className="text-cyan-500 font-bold">&gt;</span>
                <input
                    type="text"
                    className="flex-1 bg-transparent border-none text-cyan-400 focus:outline-none focus:ring-0 placeholder-cyan-900/50 text-sm"
                    placeholder="Ex: Cherche un CTO expert en cybersécurité..."
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
                    disabled={isProcessing}
                />
            </div>
        </div>
    );
}
