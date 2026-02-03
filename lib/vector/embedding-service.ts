/**
 * Embedding Service
 * Generates vector embeddings for text using Mistral AI
 */

interface EmbeddingResponse {
    embedding: number[];
    model: string;
    tokens: number;
}

export class EmbeddingService {
    private apiKey: string;
    private model: string = 'mistral-embed';
    private dimension: number = 1024;

    constructor() {
        this.apiKey = process.env.MISTRAL_API_KEY || '';

        if (!this.apiKey) {
            console.warn('MISTRAL_API_KEY not set. Embedding generation will fail.');
        }
    }

    /**
     * Generates an embedding for the given text
     */
    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.apiKey) {
            throw new Error('Mistral API key not configured');
        }

        try {
            const response = await fetch('https://api.mistral.ai/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    input: text,
                    encoding_format: 'float',
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Mistral API error: ${error.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            return data.data[0].embedding;
        } catch (error) {
            console.error('Failed to generate embedding:', error);
            throw error;
        }
    }

    /**
     * Generates embeddings for multiple texts in batch
     */
    async generateEmbeddings(texts: string[]): Promise<number[][]> {
        if (!this.apiKey) {
            throw new Error('Mistral API key not configured');
        }

        try {
            const response = await fetch('https://api.mistral.ai/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    input: texts,
                    encoding_format: 'float',
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Mistral API error: ${error.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            return data.data.map((item: any) => item.embedding);
        } catch (error) {
            console.error('Failed to generate embeddings:', error);
            throw error;
        }
    }

    /**
     * Gets the dimension of embeddings produced by this service
     */
    getDimension(): number {
        return this.dimension;
    }

    /**
     * Gets the model name being used
     */
    getModel(): string {
        return this.model;
    }
}

// Singleton instance
export const embeddingService = new EmbeddingService();
