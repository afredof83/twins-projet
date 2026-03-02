'use client';
import { useState, useRef } from 'react';
import { extractTextFromUpload, extractProfileData, confirmProfileIngestion } from '@/app/actions/auto-ingest-profile';
import { Loader2, UploadCloud, CheckCircle } from 'lucide-react';

export default function GestationOnboarding({ userId }: { userId: string }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedMatrix, setExtractedMatrix] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 1. Upload & Extraction PDF
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            // Étape A : On lit le PDF via la Server Action
            const formData = new FormData();
            formData.append('file', file);

            const uploadData = await extractTextFromUpload(formData);
            if (!uploadData.success) throw new Error("Échec lecture PDF");

            // Étape B : On envoie le texte extrait à Mistral pour profilage
            const extractRes = await extractProfileData(uploadData.extractedText || "Contenu du CV...");
            if (extractRes.success) {
                setExtractedMatrix(extractRes.data);
            }
        } catch (error) {
            alert("Erreur lors de l'analyse.");
        } finally {
            setIsProcessing(false);
        }
    };

    // 2. Validation Finale
    const handleConfirm = async () => {
        setIsProcessing(true);
        const res = await confirmProfileIngestion(userId, extractedMatrix);
        if (res.success) {
            alert("Matrice injectée avec succès.");
            window.location.href = '/'; // Redirection vers le Radar
        }
        setIsProcessing(false);
    };

    return (
        <div className="max-w-2xl mx-auto p-8 bg-zinc-950 border border-zinc-800 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Initialisation du Jumeau Numérique</h2>

            {!extractedMatrix ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-blue-500/30 p-12 text-center rounded-xl cursor-pointer hover:bg-blue-900/10 transition-all"
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
                    {isProcessing ? (
                        <Loader2 className="mx-auto w-8 h-8 text-blue-500 animate-spin" />
                    ) : (
                        <>
                            <UploadCloud className="mx-auto w-12 h-12 text-blue-400 mb-4" />
                            <p className="text-zinc-300 font-mono text-sm">Déposez votre CV ou export LinkedIn (PDF)</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in zoom-in">
                    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
                        <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">Matrice Déduite (Vérifiez les données)</h3>

                        <div className="grid grid-cols-2 gap-4 text-sm text-zinc-300">
                            <div><span className="text-zinc-500 block text-xs">Profession</span> {extractedMatrix.profession}</div>
                            <div><span className="text-zinc-500 block text-xs">Séniorité</span> {extractedMatrix.seniority}</div>
                            <div className="col-span-2"><span className="text-zinc-500 block text-xs">Mission</span> {extractedMatrix.ikigaiMission}</div>
                        </div>
                    </div>

                    <button
                        onClick={handleConfirm} disabled={isProcessing}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-all"
                    >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> CONFIRMER &amp; INJECTER</>}
                    </button>
                </div>
            )}
        </div>
    );
}
