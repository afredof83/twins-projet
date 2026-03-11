import { pipeline, env } from '@huggingface/transformers';

// Configuration pour le Web Worker
env.allowLocalModels = false;
env.useBrowserCache = true;

let translationPipeline: any = null;

// Modèle léger pour la traduction
const MODEL_NAME = 'Xenova/t5-small';

async function getPipeline(progressCallback: (data: any) => void) {
    if (translationPipeline) return translationPipeline;

    console.log('[WORKER] Initialisation du pipeline de traduction...');
    try {
        translationPipeline = await pipeline('translation', MODEL_NAME, {
            progress_callback: progressCallback,
        });
        console.log('[WORKER] Modèle chargé et prêt.');
        return translationPipeline;
    } catch (err) {
        console.error('[WORKER] Erreur lors du chargement du modèle:', err);
        throw err;
    }
}

self.onmessage = async (event) => {
    const { text, targetLanguage, sourceLanguage } = event.data;
    console.log(`[WORKER] Message reçu pour traduction vers ${targetLanguage}`);

    try {
        const pipe = await getPipeline((data: any) => {
            if (data.status === 'progress') {
                console.log(`[WORKER] Téléchargement du modèle: ${Math.round(data.progress * 100)}% (${data.file})`);
                self.postMessage({
                    type: 'progress',
                    status: 'loading',
                    progress: data.progress,
                    file: data.file
                });
            }
        });

        const task = `translate ${sourceLanguage || 'auto'} to ${targetLanguage}`;
        
        console.log(`[WORKER] Démarrage de l'inférence...`);
        const result = await pipe(text, {
            src_lang: sourceLanguage,
            tgt_lang: targetLanguage,
        });
        console.log(`[WORKER] Inférence terminée avec succès.`);

        self.postMessage({
            type: 'result',
            translation: result[0].translation_text
        });

    } catch (error: any) {
        console.error('[WORKER] Erreur de traduction:', error.message);
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
};
