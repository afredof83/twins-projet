'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function FileUploader({ profileId, onUploadComplete }: { profileId: string, onUploadComplete: () => void }) {
    const [isDragging, setIsDragging] = useState(false);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (!file) return;

        // Vérification basique (PDF ou TXT)
        if (file.type !== 'application/pdf' && file.type !== 'text/plain') {
            setStatus('error');
            setMessage('Format non supporté. PDF ou TXT uniquement.');
            return;
        }

        setStatus('uploading');
        setMessage(`Analyse du fichier ${file.name}...`);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('profileId', profileId);

        try {
            const res = await fetch('/api/memories/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Erreur upload");

            setStatus('success');
            setMessage(`Assimilation terminée ! ${data.chunks} fragments de mémoire créés.`);
            if (onUploadComplete) onUploadComplete();

            // Reset après 3 secondes
            setTimeout(() => {
                setStatus('idle');
                setMessage('');
            }, 4000);

        } catch (e: any) {
            setStatus('error');
            setMessage(e.message || "Erreur technique lors de l'ingestion.");
        }
    };

    return (
        <div
            className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${isDragging
                    ? 'border-green-500 bg-green-900/20 scale-105'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'
                }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
            }}
        >
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.txt"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            <div className="flex flex-col items-center gap-3">
                {status === 'idle' && (
                    <>
                        <div className="p-3 bg-slate-800 rounded-full text-slate-400">
                            <Upload size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-300">Injecter un document</p>
                            <p className="text-xs text-slate-500 mt-1">PDF ou TXT (Max 5MB)</p>
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-green-400 border border-slate-600"
                        >
                            Parcourir
                        </button>
                    </>
                )}

                {status === 'uploading' && (
                    <>
                        <Loader2 className="animate-spin text-purple-500" size={32} />
                        <p className="text-xs text-purple-300 animate-pulse">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="text-green-500" size={32} />
                        <p className="text-xs text-green-400 font-bold">{message}</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <AlertCircle className="text-red-500" size={32} />
                        <p className="text-xs text-red-400 font-bold">{message}</p>
                        <button onClick={() => setStatus('idle')} className="text-[10px] underline">Réessayer</button>
                    </>
                )}
            </div>
        </div>
    );
}
