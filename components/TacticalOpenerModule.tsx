'use client'

import { useState } from 'react';
import { generateTacticalOpener } from '@/app/actions/generate-opener';
import { createClient } from '@/lib/supabase/client';

export function TacticalOpenerModule({
    userId,
    targetId,
    targetClassification,
    onSuccess
}: {
    userId: string,
    targetId: string,
    targetClassification?: string,
    onSuccess: () => void
}) {
    const [hook, setHook] = useState('');
    const [message, setMessage] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const result = await generateTacticalOpener(userId, targetId);
            if (result.success) {
                setHook(result.hook || '');
                setMessage(result.message || '');
            } else {
                console.error(result.error);
                alert("Échec de la génération tactique.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendRequest = async () => {
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { alert('Session expirée.'); return; }

            const res = await fetch('/api/network/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    targetId,
                    senderClassification: targetClassification ?? 'entité inconnue',
                    initialMessage: hook,
                    fullMessage: message
                }),
            });
            const data = await res.json();
            if (data.success) {
                onSuccess();
            } else {
                alert(`[ERREUR] ${data.error || 'Demande échouée.'}`);
            }
        } catch (err: any) {
            alert(`[CRITIQUE] Échec de connexion : ${err.message}`);
        }
    };

    return (
        <div className="mt-4 border border-cyan-800 bg-black p-4 rounded col-span-full">
            <h3 className="text-cyan-400 font-bold mb-2 flex items-center">
                <span>🎯 PROTOCOLE D'ENGAGEMENT</span>
            </h3>

            <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="mb-3 text-xs bg-cyan-900/50 hover:bg-cyan-700 text-cyan-200 py-1 px-3 rounded border border-cyan-700 transition-colors"
            >
                {isGenerating ? 'Calcul de la trajectoire...' : 'Générer une approche IA (Opener)'}
            </button>

            <input
                type="text"
                className="w-full bg-gray-900 border border-gray-700 p-2 text-white rounded mb-2 text-sm font-bold text-cyan-400 focus:border-cyan-500"
                placeholder="Objet de l'approche..."
                value={hook}
                onChange={(e) => setHook(e.target.value)}
            />

            <textarea
                className="w-full bg-gray-900 border border-gray-700 p-2 text-white rounded min-h-[80px] text-sm focus:border-cyan-500 mb-3"
                placeholder="Tapez votre message ou laissez l'Agent le générer..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
            />

            <div className="flex gap-2">
                <button
                    onClick={handleSendRequest}
                    disabled={!message.trim()}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-2 rounded disabled:opacity-50 transition-all uppercase tracking-wider text-[11px]"
                >
                    OUVRIR LE CANAL SÉCURISÉ
                </button>
            </div>
        </div>
    );
}
