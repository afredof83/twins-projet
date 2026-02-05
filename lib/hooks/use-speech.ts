import { useState, useEffect, useRef } from 'react';

export function useSpeech() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Référence pour la reconnaissance vocale
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // Initialisation (seulement côté client)
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            // @ts-ignore
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = false; // On arrête d'écouter quand la phrase finit
            recognition.lang = 'fr-FR';
            recognition.interimResults = false;

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);

            recognition.onresult = (event: any) => {
                const text = event.results[0][0].transcript;
                setTranscript(text);
            };

            recognitionRef.current = recognition;
        }
    }, []);

    // Démarrer l'écoute
    const startListening = () => {
        if (recognitionRef.current) {
            setTranscript(''); // Reset
            recognitionRef.current.start();
        } else {
            alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
        }
    };

    // Arrêter l'écoute
    const stopListening = () => {
        if (recognitionRef.current) recognitionRef.current.stop();
    };

    // Faire parler le Jumeau
    const speak = (text: string) => {
        if ('speechSynthesis' in window) {
            // On arrête s'il parle déjà
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'fr-FR';
            utterance.rate = 1.0; // Vitesse normale
            utterance.pitch = 1.0; // Tonalité normale

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);

            window.speechSynthesis.speak(utterance);
        }
    };

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        speak,
        isSpeaking
    };
}
