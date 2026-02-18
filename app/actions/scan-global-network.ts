'use server'

import { Mistral } from '@mistralai/mistralai';
import { prisma } from "@/lib/prisma";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function scanGlobalNetwork(userId: string) {
    // 1. On récupère le profil de l'agent AVEC ses nouveaux champs
    // Casting 'any' pour éviter les erreurs de build si les types Prisma ne sont pas à jour
    const agent: any = await prisma.profile.findUnique({
        where: { id: userId }
    });

    if (!agent) throw new Error("Agent introuvable.");

    // 2. On récupère les autres clones
    const networkNodes: any[] = await prisma.profile.findMany({
        where: { id: { not: userId } },
        include: { memories: { take: 5, orderBy: { createdAt: 'desc' } } }
    });

    const identityContext = `
        AGENT PRINCIPAL:
        - Profession: ${agent.profession || 'Inconnue'}
        - Âge: ${agent.age || 'Inconnu'}
        - Objectifs: ${agent.objectives?.join(', ') || 'Scan Global'}
        - Hobbies: ${agent.hobbies?.join(', ') || 'N/A'}
    `;

    const prompt = `
        Tu es l'IA Tactique MISTRAL-TWIN. 
        CONTEXTE DE L'AGENT : ${identityContext}

        ANALYSE DU RÉSEAU : ${JSON.stringify(networkNodes)}

        MISSION : Identifie 3 opportunités de matching. 
        Si l'objectif est "Rencontres", cherche des affinités personnelles. 
        Si c'est "Travail", cherche des synergies de compétences.

        Réponds en JSON uniquement : 
        { "globalStatus": "GREEN|ORANGE|RED", "analysisSummary": "...", "opportunities": [...] }
    `;

    const response = await client.chat.complete({
        model: "mistral-large-latest",
        messages: [{ role: "system", content: prompt }],
        responseFormat: { type: "json_object" }
    });

    const rawContent = response.choices?.[0].message.content;
    if (!rawContent) throw new Error("Réponse vide de Mistral");

    return JSON.parse(rawContent as string);
}
