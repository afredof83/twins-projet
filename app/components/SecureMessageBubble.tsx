'use client';

import { useState, useEffect } from 'react';
import { decryptLocal } from '@/lib/crypto-client';
import { TranslationManager } from '@/lib/translation-client';
import { Loader2, Lock, Languages } from 'lucide-react';

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
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [translationProgress, setTranslationProgress] = useState(0);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function decode() {
            if (!encryptedPayload.startsWith('🧠')) {
                if (isMounted) {
                    setClearText(encryptedPayload);
                    if (onDecrypted) onDecrypted(id, encryptedPayload, isSender);
                }
                return;
            }

            if (!sharedKey) return;

            try {
                const decrypted = await decryptLocal(encryptedPayload, sharedKey);
                console.log(`[TRADUCTION] Texte déchiffré: "${decrypted.substring(0, 30)}..."`);
                console.log(`[TRADUCTION] Langue cible: ${TranslationManager.getTargetLanguage()}`);

                if (isMounted) {
                    setClearText(decrypted);
                    if (onDecrypted) onDecrypted(id, decrypted, isSender);

                    if (!isSender) {
                        tryAutoTranslate(decrypted);
                    }
                }
            } catch (err) {
                console.error("Échec du déchiffrement", err);
                if (isMounted) setError(true);
            }
        }

        async function tryAutoTranslate(text: string) {
            const targetLang = TranslationManager.getTargetLanguage();
            
            if (text.length > 3) {
                console.log(`[TRADUCTION] Tentative de traduction vers: ${targetLang}`);
                
                setIsTranslating(true);
                TranslationManager.init((progress) => {
                    if (isMounted) setTranslationProgress(progress);
                });

                try {
                    const result = await TranslationManager.translate(text, targetLang);
                    
                    if (isMounted) {
                        if (result.trim().toLowerCase() === text.trim().toLowerCase()) {
                            console.log('[TRADUCTION] Ignorée: Langue source = Langue cible');
                            setTranslatedText(null);
                        } else {
                            console.log(`[TRADUCTION] Succès: "${result.substring(0, 30)}..."`);
                            setTranslatedText(result);
                        }
                    }
                } catch (e) {
                    console.error("[TRADUCTION] Erreur critique:", e);
                } finally {
                    if (isMounted) setIsTranslating(false);
                }
            } else {
                console.log('[TRADUCTION] Texte trop court, ignoré.');
            }
        }

        decode();
        return () => { isMounted = false; };
    }, [encryptedPayload, sharedKey, isSender]); // eslint-disable-line react-hooks/exhaustive-deps

    const bubbleAlignClass = isSender ? 'self-end items-end' : 'self-start items-start';
    const bubbleColorClass = isSender
        ? 'bg-[var(--primary)]/20 border-[var(--primary)]/30 text-[var(--text-main)]'
        : 'bg-[var(--bg-card)]/50 border-white/10 text-[var(--text-main)]/80';

    return (
        <div className={`flex flex-col max-w-[80%] mb-4 ${bubbleAlignClass}`}>
            <div className={`px-4 py-3 rounded-2xl shadow-lg border relative group ${bubbleColorClass}`}>
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
                    <>
                        <p className="text-sm md:text-base whitespace-pre-wrap">{clearText}</p>
                        
                        {/* Affichage de la traduction si disponible */}
                        {translatedText && (
                            <div className="mt-2 pt-2 border-t border-white/5 animate-in fade-in duration-500">
                                <p className="text-sm text-zinc-400 italic font-light">{translatedText}</p>
                                <span className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1 uppercase tracking-widest font-bold opacity-60">
                                    <Languages className="w-3 h-3" /> (traduit)
                                </span>
                            </div>
                        )}

                        {/* Barre de progression du téléchargement de modèle */}
                        {isTranslating && !translatedText && translationProgress > 0 && translationProgress < 100 && (
                            <div className="mt-2 text-[9px] text-emerald-500 uppercase font-mono tracking-tighter flex flex-col gap-1">
                                <div className="flex justify-between">
                                    <span>Téléchargement module IA...</span>
                                    <span>{Math.round(translationProgress)}%</span>
                                </div>
                                <div className="w-full h-0.5 bg-zinc-900 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 transition-all duration-300" 
                                        style={{ width: `${translationProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
