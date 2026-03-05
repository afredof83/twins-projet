"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Paperclip, Send, Loader2, CheckCircle, AlertCircle, X, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadCortexMemoryContext } from '@/app/actions/memory-ingest';

type UploadState = 'IDLE' | 'UPLOADING' | 'ANALYZING' | 'SUCCESS' | 'ERROR';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function CortexUploader() {
    const [uploadState, setUploadState] = useState<UploadState>('IDLE');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [textContext, setTextContext] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const router = useRouter();

    // Auto-resize du textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [textContext]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            // Validation: Size
            if (file.size > MAX_FILE_SIZE) {
                setErrorMsg('Le fichier dépasse la limite de 5Mo.');
                setUploadState('ERROR');
                setTimeout(() => setUploadState('IDLE'), 4000);
                return;
            }

            // Validation: Type
            const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                setErrorMsg('Format non supporté. Utilisez PDF, TXT ou MD.');
                setUploadState('ERROR');
                setTimeout(() => setUploadState('IDLE'), 4000);
                return;
            }

            setSelectedFile(file);
            setErrorMsg('');
        }
    };

    const removeFile = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const triggerFileInput = () => {
        if (uploadState === 'IDLE' || uploadState === 'ERROR') {
            fileInputRef.current?.click();
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!textContext.trim() && !selectedFile) return;

        setUploadState('UPLOADING');

        let finalExtractedText = textContext.trim();
        let fileName = 'manual';

        try {
            // ⚡ ANTIGRAVITY: Extraction locale avant l'envoi réseau !
            if (selectedFile) {
                fileName = selectedFile.name;
                setUploadState('ANALYZING'); // On met à jour l'UI pendant l'extraction locale

                if (selectedFile.type === 'application/pdf') {
                    const { extractTextFromPdf } = await import('@/lib/pdf-client');
                    const pdfText = await extractTextFromPdf(selectedFile);
                    finalExtractedText += `\n[FICHIER: ${fileName}]\n\n${pdfText}`;
                } else {
                    const text = await selectedFile.text();
                    finalExtractedText += `\n[FICHIER: ${fileName}]\n\n${text}`;
                }
            }

            // On n'envoie PLUS le binaire (File), SEULEMENT le texte pur
            const formData = new FormData();
            formData.append('textContext', finalExtractedText);
            formData.append('fileName', fileName);
            formData.append('hasFile', selectedFile ? 'true' : 'false');

            const data = await uploadCortexMemoryContext(formData);

            if (!data.success) throw new Error(data.error || "Erreur lors de l'envoi");

            setUploadState('SUCCESS');
            router.refresh();

            // Reset l'état après succès
            setTimeout(() => {
                setUploadState('IDLE');
                setTextContext('');
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                if (textareaRef.current) textareaRef.current.style.height = 'auto';
            }, 3000);

        } catch (err: any) {
            setErrorMsg(err.message || 'Une erreur est survenue');
            setUploadState('ERROR');
            setTimeout(() => setUploadState('IDLE'), 4000);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const isBusy = uploadState === 'UPLOADING' || uploadState === 'ANALYZING' || uploadState === 'SUCCESS';
    const isReadyToSubmit = textContext.trim().length > 0 || selectedFile !== null;

    return (
        <div className="w-full max-w-2xl mx-auto transition-all duration-300">
            <div className={`
                relative bg-black/40 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all duration-300
                ${uploadState === 'ERROR' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
                    uploadState === 'SUCCESS' ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]' :
                        'border-white/10 focus-within:border-purple-500/50 focus-within:shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:border-white/20'}
            `}>

                {/* Overlay de chargement ou succès (prend le dessus sur le formulaire) */}
                <AnimatePresence>
                    {uploadState !== 'IDLE' && uploadState !== 'ERROR' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
                        >
                            {uploadState === 'UPLOADING' && (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                                    <span className="text-sm font-medium text-white/90">Préparation des données...</span>
                                </div>
                            )}
                            {uploadState === 'ANALYZING' && (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="relative">
                                        <div className="absolute inset-0 rounded-full border border-purple-500/40 animate-ping"></div>
                                        <Brain className="w-8 h-8 text-blue-400 animate-pulse relative z-10" />
                                    </div>
                                    <span className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-blue-300 animate-pulse">
                                        Le Jumeau analyse le contenu...
                                    </span>
                                </div>
                            )}
                            {uploadState === 'SUCCESS' && (
                                <div className="flex flex-col items-center gap-3">
                                    <CheckCircle className="w-10 h-10 text-green-400" />
                                    <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-400 text-center">
                                        Mémoire ingérée avec succès
                                    </span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Formulaire principal */}
                <form
                    onSubmit={handleSubmit}
                    className={`flex flex-col p-2 transition-opacity duration-300 ${isBusy ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}
                >
                    {/* Zone de texte libre */}
                    <div className="p-3">
                        <textarea
                            ref={textareaRef}
                            value={textContext}
                            onChange={(e) => setTextContext(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isBusy}
                            placeholder="Collez une URL à scraper, tapez une note, ou décrivez un contexte..."
                            className="w-full min-h-[60px] max-h-[200px] bg-transparent text-gray-200 placeholder-gray-500 outline-none resize-none text-sm md:text-base leading-relaxed"
                        />
                    </div>

                    {/* Zone d'affichage du fichier sélectionné */}
                    <AnimatePresence>
                        {selectedFile && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="px-4 pb-2"
                            >
                                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-2 pr-3 w-max max-w-full">
                                    <div className="p-1.5 bg-purple-500/20 rounded-md text-purple-300">
                                        <Paperclip className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs text-gray-300 truncate max-w-[200px] md:max-w-xs">{selectedFile.name}</span>
                                    <button
                                        type="button"
                                        onClick={removeFile}
                                        className="ml-1 p-1 hover:bg-white/10 rounded-full text-gray-500 hover:text-red-400 transition-colors shrink-0"
                                        title="Retirer le fichier"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Affichage des Erreurs */}
                    <AnimatePresence>
                        {uploadState === 'ERROR' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="px-4 pb-2 flex items-center gap-2 text-red-400 text-xs"
                            >
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Barre d'action inférieure */}
                    <div className="flex items-center justify-between p-2 pt-0 border-t border-transparent mt-2">

                        {/* Actions Gauche */}
                        <div className="flex items-center">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".pdf,.txt,.md"
                                onChange={handleFileInput}
                                disabled={isBusy}
                            />
                            <button
                                type="button"
                                onClick={triggerFileInput}
                                disabled={isBusy}
                                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group relative"
                                title="Joindre un document (PDF, TXT, MD)"
                            >
                                <Paperclip className="w-5 h-5" />
                                {/* Tooltip basique */}
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                    Joindre un document
                                </span>
                            </button>
                        </div>

                        {/* Actions Droite */}
                        <div>
                            <button
                                type="submit"
                                disabled={!isReadyToSubmit || isBusy}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                                    ${!isReadyToSubmit
                                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:scale-[1.02] active:scale-[0.98]'
                                    }
                                `}
                            >
                                <span>Ingérer</span>
                                <Send className="w-4 h-4 ml-1" />
                            </button>
                        </div>

                    </div>
                </form>
            </div>
        </div>
    );
}
