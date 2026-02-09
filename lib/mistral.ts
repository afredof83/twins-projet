// lib/mistral.ts
export async function getMistralEmbedding(text: string): Promise<number[] | null> {
    try {
        const response = await fetch('https://api.mistral.ai/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: "mistral-embed",
                input: [text.replace(/\n/g, ' ')] // Nettoyage basique
            })
        });

        if (!response.ok) {
            console.error('Erreur Mistral Embedding:', await response.text());
            return null;
        }

        const data = await response.json();
        return data.data[0].embedding; // Retourne le tableau de 1024 nombres
    } catch (error) {
        console.error('Crash Embedding:', error);
        return null;
    }
}
