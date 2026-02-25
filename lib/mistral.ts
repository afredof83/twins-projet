import { Mistral } from '@mistralai/mistralai';

const apiKey = process.env.MISTRAL_API_KEY;

if (!apiKey) {
    throw new Error("[CRITIQUE] MISTRAL_API_KEY est manquante dans les variables d'environnement.");
}

// Singleton pattern pour éviter de multiples instanciations en serverless
const globalForMistral = global as unknown as { mistralClient: Mistral };

export const mistralClient = globalForMistral.mistralClient || new Mistral({ apiKey });


if (process.env.NODE_ENV !== 'production') globalForMistral.mistralClient = mistralClient;

export async function getMistralEmbedding(text: string) {
    try {
        const response = await mistralClient.embeddings.create({
            model: "mistral-embed",
            inputs: [text],
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error("Erreur d'embedding Mistral:", error);
        return null;
    }
}
