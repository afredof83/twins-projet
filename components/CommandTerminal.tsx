'use client'

import { useState } from 'react';
import { executeTerminalCommand } from '@/app/actions/terminal-command';

export function CommandTerminal({ userId }: { userId: string }) {
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
            } else {
                setHistory(prev => [...prev, { role: 'agent', text: "[ERREUR] Liaison IA perdue." }]);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col border border-cyan-800 bg-black/80 rounded h-[500px] font-mono text-sm shadow-lg shadow-cyan-900/20 col-span-full mt-8">
            {/* HEADER TERMINAL */}
            <div className="bg-cyan-900/30 border-b border-cyan-800 p-2 text-cyan-400 font-bold flex items-center justify-between">
                <span>&gt; TWINS_OS // TERMINAL DE COMMANDEMENT UNIFIÉ</span>
                <span className="text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> RADAR EN LIGNE
                </span>
            </div>

            {/* ZONE DE CHAT / LOGS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-gray-300">
                <div className="text-cyan-600/50">Système initialisé. En attente d'ordres tactiques...</div>

                {history.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <span className={`text-[10px] mb-1 ${msg.role === 'user' ? 'text-gray-500' : 'text-cyan-500'}`}>
                            {msg.role === 'user' ? 'VOUS' : 'GARDIEN'}
                        </span>
                        <div className={`p-3 rounded max-w-[85%] ${msg.role === 'user'
                                ? 'bg-gray-800 border border-gray-700 text-white'
                                : 'bg-cyan-950/40 border border-cyan-900/50 text-cyan-100 whitespace-pre-wrap'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isProcessing && (
                    <div className="text-cyan-500 animate-pulse">&gt; Scan réseau et Web en cours...</div>
                )}
            </div>

            {/* ZONE DE SAISIE */}
            <div className="p-3 border-t border-cyan-800 bg-black flex gap-2 items-center">
                <span className="text-cyan-500 font-bold">&gt;</span>
                <input
                    type="text"
                    className="flex-1 bg-transparent border-none text-cyan-400 focus:outline-none focus:ring-0 placeholder-cyan-900/50"
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
