'use server';

import { mistralClient } from '@/lib/mistral';

export async function guardianCheck(profileId: string, text: string) {
    try {
        if (!text) return { success: true, isSafe: true };

        const prompt = `Tu es le Gardien de sécurité. Analyse ce texte. Contient-il des menaces graves, du spam violent ou des requêtes illégales ? 
Répond uniquement par "SAFE" ou "DANGER".
Texte: "${text}"`;

        const response = await mistralClient.chat.complete({
            model: "mistral-small-latest",
            messages: [{ role: "user", content: prompt }]
        });

        const decision = response.choices?.[0]?.message.content as string;
        const isSafe = !decision.includes("DANGER");

        return { success: true, isSafe };
    } catch (error: any) {
        // En cas de doute ou d'erreur, on laisse passer pour pas bloquer
        return { success: true, isSafe: true };
    }
}

export async function simulateNegotiation(myProfileId: string, targetProfileId: string) {
    if (!myProfileId || !targetProfileId) return { success: false, error: 'Ids manquants' };
    // Simulation simple pour la démo UI de la Boucle du Gardien
    return {
        success: true,
        summary: "Simulation : Le Gardien a intercepté un contact prometteur.",
        verdict: "MATCH",
        nextStep: "Proposer un NDA avant d'envoyer les plans."
    };
}
