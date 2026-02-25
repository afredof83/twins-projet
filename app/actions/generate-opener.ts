'use server'
import { mistralClient } from "@/lib/mistral";

import { prisma } from "@/lib/prisma";

const client = mistralClient;

export async function generateTacticalOpener(userId: string, targetId: string) {
    if (!userId || !targetId) throw new Error("Coordonnées de frappe manquantes.");

    // 1. Récupération des deux profils (Les deux ADN)
    const user = await prisma.profile.findUnique({
        where: { id: userId },
        select: { profession: true, industry: true, objectives: true, thematicProfile: true }
    });

    const target = await prisma.profile.findUnique({
        where: { id: targetId },
        select: { profession: true, industry: true, objectives: true, thematicProfile: true }
    });

    if (!user || !target) throw new Error("Cible ou Expéditeur introuvable.");

    // 2. Le Prompt d'Ingénierie Sociale
    const prompt = `
Tu es MISTRAL-TWIN, un proxy tactique d'ingénierie sociale.
Ta mission : Rédiger l'approche PARFAITE.

ADN EXPÉDITEUR : ${user.profession || 'Non spécifié'} - ${user.industry || 'Non spécifié'}
ADN CIBLE : ${target.profession || 'Non spécifié'} - ${target.industry || 'Non spécifié'}

RÈGLES D'ENGAGEMENT :
Tu dois générer DEUX éléments distincts.
1. "hook" : Un objet/titre ultra-court pour la notification. Max 6 mots. (Ex: "Synergie : Logistique & Impression 3D").
2. "message" : Le message complet de 3 phrases maximum. Direct, froid, professionnel. Pas de formules de politesse inutiles.

FORMAT DE RÉPONSE OBLIGATOIRE (JSON STRICT) :
{
  "hook": "Ton accroche ici",
  "message": "Ton message complet ici"
}
`;

    try {
        const response = await client.chat.complete({
            model: "mistral-large-latest",
            messages: [{ role: "user", content: prompt }],
            responseFormat: { type: "json_object" }
        });

        const rawContent = response.choices?.[0].message.content;
        if (!rawContent) throw new Error("Silence radio de l'IA.");

        const openerData = JSON.parse(rawContent as string);
        return { success: true, hook: openerData.hook, message: openerData.message };

    } catch (error: any) {
        console.error("[OPENER ERROR]", error);
        return { success: false, error: error.message };
    }
}
