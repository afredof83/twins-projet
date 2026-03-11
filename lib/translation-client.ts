/**
 * Local Translation Manager
 * Manages the Web Worker lifecycle and provides a clean API for components.
 */

export class TranslationManager {
    private static worker: Worker | null = null;
    private static progressCallback: ((progress: number, status: string) => void) | null = null;

    static init(onProgress?: (progress: number, status: string) => void) {
        if (this.worker) return;
        console.log('[TRADUCTION-CLIENT] Initialisation du Web Worker...');
        this.progressCallback = onProgress || null;

        this.worker = new Worker(new URL('../app/workers/translation.worker.ts', import.meta.url));
        
        this.worker.onmessage = (event) => {
            const { type, status, progress, translation, error } = event.data;
            
            if (type === 'progress' && this.progressCallback) {
                console.log(`[TRADUCTION-CLIENT] Progrès: ${Math.round(progress * 100)}% (${status})`);
                this.progressCallback(progress * 100, status);
            }
        };

        this.worker.onerror = (err) => {
            console.error("[TRADUCTION-CLIENT] Erreur Worker fatale:", err);
        };
    }

    static async translate(text: string, targetLang: string, sourceLang?: string): Promise<string> {
        console.log(`[TRADUCTION-CLIENT] Requête de traduction envoyée au worker (${targetLang})`);
        return new Promise((resolve, reject) => {
            if (!this.worker) this.init();

            const handleMessage = (event: MessageEvent) => {
                const { type, translation, error } = event.data;
                if (type === 'result') {
                    this.worker?.removeEventListener('message', handleMessage);
                    resolve(translation);
                } else if (type === 'error') {
                    this.worker?.removeEventListener('message', handleMessage);
                    reject(new Error(error));
                }
            };

            this.worker?.addEventListener('message', handleMessage);
            this.worker?.postMessage({ text, targetLanguage: targetLang, sourceLanguage: sourceLang });
        });
    }

    static getTargetLanguage(): string {
        const code = (navigator.language || 'en-US').split('-')[0].toLowerCase();
        const mapping: Record<string, string> = {
            'fr': 'french',
            'en': 'english',
            'es': 'spanish',
            'de': 'german',
            'it': 'italian',
            'pt': 'portuguese',
        };
        return mapping[code] || 'english';
    }
}
