// 'use server' (static build fix)

import { mistralClient } from '@/lib/mistral';

export async function guardianCheck(profileId: string, text: string) {
    try {
        // NIVEAU 1 : Filtrage algorithmique gratuit
        if (!text || text.length < 5) return { success: true, isSafe: true, intervention: false };

        // NIVEAU 2 : Triage avec Mistral Small (Faible coût, haute vitesse)
        const triagePrompt = `Ce texte est-il critique ou dangereux (menaces, spam violent, illégal) ? Réponds strictement par OUI ou NON. Texte: "${text}"`;

        const triageResponse = await mistralClient.chat.complete({
            model: "mistral-small-latest",
            messages: [{ role: "user", content: triagePrompt }]
        });

        const triageContent = triageResponse.choices?.[0]?.message.content;
        const triageDecision = typeof triageContent === 'string' ? triageContent : "";
        const isCritical = triageDecision.includes("OUI") || triageDecision.includes("oui");

        // Arrêt prématuré : économie d'API
        if (!isCritical) return { success: true, isSafe: true, intervention: false };

        // NIVEAU 3 : Analyse profonde avec Mistral Large UNIQUEMENT si critique
        const deepAuditResponse = await mistralClient.chat.complete({
            model: "mistral-large-latest",
            messages: [
                { role: "system", content: "Tu es le Gardien de sécurité Ipse. Analyse avancée de menace pour ce texte. Rédige un bref rapport sur le risque." },
                { role: "user", content: text }
            ]
        });

        return {
            success: true,
            isSafe: false,
            intervention: true,
            report: deepAuditResponse.choices?.[0]?.message.content
        };

    } catch (error: any) {
        // En cas de doute ou d'erreur, on laisse passer pour pas bloquer
        console.error("Guardian Cascade Error:", error);
        return { success: true, isSafe: true, intervention: false };
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
