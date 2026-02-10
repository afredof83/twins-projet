'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface AudioInputProps {
    onTranscript: (text: string) => void;
    isProcessing: boolean;
}

export default function AudioInput({ onTranscript, isProcessing }: AudioInputProps) {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // Initialisation de l'API Web Speech (Compatible Chrome/Edge/Safari)
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false; // Arrêt auto après la phrase
                recognitionRef.current.interimResults = false;
                recognitionRef.current.lang = 'fr-FR'; // Langue Française

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    console.log('[STT] Entendu :', transcript);
                    onTranscript(transcript);
                    setIsListening(false);
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error('[STT] Erreur :', event.error);
                    setIsListening(false);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }
    }, [onTranscript]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                    setIsListening(true);
                } catch (e) {
                    console.error("Erreur démarrage micro", e);
                }
            } else {
                alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
            }
        }
    };

    return (
        <button
            onClick={toggleListening}
            disabled={isProcessing}
            className={`p-3 rounded-full border transition-all duration-300 relative group ${isListening
                    ? 'bg-red-600 border-red-400 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]'
                    : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-cyan-400 hover:border-cyan-500'
                }`}
            title="Activer la commande vocale"
        >
            {isProcessing ? (
                <Loader2 className="animate-spin" size={18} />
            ) : isListening ? (
                <>
                    <MicOff size={18} />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                </>
            ) : (
                <Mic size={18} />
            )}
        </button>
    );
}
