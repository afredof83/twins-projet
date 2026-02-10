'use client';
import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function VoiceOutput({ textToSpeak, enabled = true }: { textToSpeak: string | null, enabled: boolean }) {
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        if (!textToSpeak || !enabled) return;

        // Annuler la parole précédente
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'fr-FR'; // Voix française
        utterance.rate = 1.1; // Un peu plus rapide et dynamique
        utterance.pitch = 1.0; // Ton naturel

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);

        return () => {
            window.speechSynthesis.cancel();
        };
    }, [textToSpeak, enabled]);

    if (!isSpeaking) return null;

    return (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-cyan-900/80 backdrop-blur border border-cyan-500 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] z-50 animate-in fade-in slide-in-from-bottom-4">
            <Volume2 className="text-cyan-300 animate-pulse" size={20} />
            <div className="flex gap-1 h-3 items-center">
                {/* ONDES SONORES ANIMÉES */}
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="w-1 bg-cyan-400 rounded-full animate-sound-wave"
                        style={{
                            height: `${Math.random() * 100}%`,
                            animationDelay: `${i * 0.1}s`
                        }}
                    ></div>
                ))}
            </div>
            <span className="text-xs font-bold text-cyan-100 ml-2 uppercase tracking-wider">Transmission Vocale...</span>
        </div>
    );
}
