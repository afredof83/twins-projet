'use client';

import { useState, useEffect } from 'react';
import { decryptLocal } from '@/lib/crypto-client';
import { Loader2, Lock } from 'lucide-react';

export function SecureMessageBubble({
    id,
    encryptedPayload,
    sharedKey,
    isSender,
    onDecrypted
}: {
    id: string,
    encryptedPayload: string,
    sharedKey: CryptoKey | null,
    isSender: boolean,
    onDecrypted?: (id: string, clearText: string, isSender: boolean) => void
}) {
    const [clearText, setClearText] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function decode() {
            // Si le message n'est pas chiffré (erreur ou legacy), on l'affiche
            if (!encryptedPayload.startsWith('🧠')) {
                if (isMounted) {
                    setClearText(encryptedPayload);
                    if (onDecrypted) onDecrypted(id, encryptedPayload, isSender);
                }
                return;
            }

            if (!sharedKey) return; // En attente de la clé de l'Agent

            try {
                const decrypted = await decryptLocal(encryptedPayload, sharedKey);
                if (isMounted) {
                    setClearText(decrypted);
                    if (onDecrypted) onDecrypted(id, decrypted, isSender);
                }
            } catch (err) {
                console.error("Échec du déchiffrement", err);
                if (isMounted) setError(true);
            }
        }

        decode();
        return () => { isMounted = false; };
    }, [encryptedPayload, sharedKey]);

    const bubbleAlignClass = isSender ? 'self-end items-end' : 'self-start items-start';
    const bubbleColorClass = isSender
        ? 'bg-blue-600/20 border-blue-500/30 text-blue-100'
        : 'bg-zinc-800/50 border-zinc-700 text-zinc-300';

    return (
        <div className={`flex flex-col max-w-[80%] mb-4 ${bubbleAlignClass}`}>
            <div className={`px-4 py-3 rounded-2xl shadow-lg border ${bubbleColorClass}`}>
                {error ? (
                    <span className="text-red-400 text-sm flex items-center gap-2">
                        <Lock className="w-4 h-4" /> <i>Verrouillé (Clé manquante)</i>
                    </span>
                ) : clearText === null ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                        <span className="text-xs text-zinc-400">Déchiffrement...</span>
                    </div>
                ) : (
                    <p className="text-sm md:text-base whitespace-pre-wrap">{clearText}</p>
                )}
            </div>
        </div>
    );
}
