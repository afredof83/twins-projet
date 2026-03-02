'use server'
import { mistralClient } from "@/lib/mistral";

export async function askIpseAdvice(decryptedContext: string) {
    try {
        const prompt = `
    Tu es Ipse, le conseiller stratégique B2B de cet utilisateur.
    Il est actuellement dans une négociation confidentielle en Dark Room (Chat E2EE).
    
    Voici les 5 derniers échanges de la conversation :
    """
    ${decryptedContext}
    """
    
    MISSION :
    Fournis UNE SEULE PHRASE (courte, percutante, pragmatique) pour lui suggérer quoi répondre.
    Cherche à identifier un levier de persuasion, un angle mort de l'interlocuteur, ou une manière de closer la discussion.
    Ne sois pas poli, sois tactique.
    `;

        const response = await mistralClient.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }], // Utilise 'user' role par sécurité car 'system' est géré différemment parfois.
            temperature: 0.3,
        });

        return { success: true, advice: response.choices?.[0].message?.content as string };
    } catch (error) {
        console.error("Erreur Ipse Advisor:", error);
        return { success: false, error: "Interférence réseau avec Ipse." };
    }
}
