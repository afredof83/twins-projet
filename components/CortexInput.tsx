'use client';
import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabaseBrowser';
import { Paperclip, Send, Loader2, BrainCircuit } from 'lucide-react';

export default function CortexInput({ userId }: { userId: string }) {
    const [text, setText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    // --- 1. ENVOI D'UNE PENSÉE MANUELLE (TEXTE) ---
    const handleSendThought = async () => {
        if (!text.trim() || !userId) return;
        setIsUploading(true);

        try {
            const { error } = await supabase.from('Memory').insert([
                {
                    content: text,
                    profileId: userId,      // NOM EXACT (Prisma)
                    type: 'thought',        // Type pour le Cortex
                    createdAt: new Date().toISOString(), // NOM EXACT
                    source: 'manual_input'
                }
            ]);

            if (error) throw error;
            setText(''); // On vide le champ si succès
            alert("Pensée encodée dans le Cortex.");
        } catch (err: any) {
            console.error("Erreur Encodage Manuel:", err);
            alert("Erreur d'encodage : " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    // --- 2. GESTION DES FICHIERS (TAP TO UPLOAD) ---
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;

        setIsUploading(true);
        console.log("Traitement du fichier :", file.name);

        // ICI : Ajoutez votre logique existante d'upload de PDF
        // (Upload vers Storage -> Extraction texte -> Insertion dans Memory)
        // Pour l'instant, on simule la réussite
        // TODO: Connecter avec l'API /api/sensors/upload

        // Simulate upload for now as requested
        setTimeout(() => {
            setIsUploading(false);
            alert(`${file.name} envoyé au radar.`);
        }, 2000);
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-4 bg-slate-900/50 border border-teal-500/20 rounded-2xl shadow-xl">
            <div className="flex flex-col gap-3">

                {/* ZONE DE TEXTE MANUELLE */}
                <div className="relative">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Encoder une pensée manuelle dans le Cortex..."
                        className="w-full bg-slate-800 text-slate-100 p-4 rounded-xl border border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none min-h-[100px] text-sm"
                    />

                    {/* BOUTON TACTILE POUR LES FICHIERS (TROMBONE) */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-3 left-3 p-2 text-slate-400 hover:text-teal-400 transition-colors"
                        title="Joindre un PDF ou texte"
                    >
                        <Paperclip size={20} />
                    </button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.txt"
                    />
                </div>

                {/* ACTIONS BAR */}
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2 text-[10px] text-teal-500/70">
                        <BrainCircuit size={12} />
                        <span>Mode : Encodage Synaptique</span>
                    </div>

                    <button
                        onClick={handleSendThought}
                        disabled={isUploading || !text.trim()}
                        className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                    >
                        {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                        {isUploading ? "Calcul..." : "ENCODER"}
                    </button>
                </div>
            </div>
        </div>
    );
}
