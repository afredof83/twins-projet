'use server';

import { mistralClient } from '@/lib/mistral';

export async function translateMessage(text: string, targetLanguage: string) {
    try {
        if (!text) throw new Error("Texte manquant");

        const response = await mistralClient.chat.complete({
            model: "mistral-large-latest",
            messages: [{
                role: "system",
                content: `Tu es un traducteur de l'extrême. Traduis fidèlement ce texte en ${targetLanguage}. Renvoie UNIQUEMENT la traduction, sans aucun commentaire.`
            }, {
                role: "user",
                content: text
            }]
        });

        const translation = response.choices?.[0]?.message.content as string;
        return { success: true, translation };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
