'use server'
import { mistralClient } from "@/lib/mistral";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const client = mistralClient;

export async function autoIngestProfile(userId: string, rawData: string) {
    try {
        console.log(`[AUTO INGEST] User: ${userId}, Data Length: ${rawData.length}`);

        const prompt = `
Tu es MISTRAL-TWIN, une IA de profilage psychologique et professionnel de niveau militaire.
Ta mission : Analyser les données brutes d'un individu et reconstruire sa Matrice d'Identité.

DONNÉES BRUTES FOURNIES PAR LA CIBLE :
"""
${rawData}
"""

INSTRUCTIONS D'ANALYSE STRICTES :
1. Tu dois déduire le profil de la cible.
2. Pour les champs à choix multiples, tu DOIS utiliser EXACTEMENT l'une des valeurs autorisées ci-dessous. AUCUNE AUTRE VALEUR n'est acceptée.
3. Si une information manque, déduis la plus probable.

VALEURS AUTORISÉES POUR LES CHAMPS :
- "industry" : Choisir parmi ["Tech & Data", "Commerce & Vente", "Marketing & Design", "Finance & Crypto", "Santé & Bien-être", "Artisanat & BTP", "Autre (préciser)"]
- "seniority" : Choisir parmi ["Junior (0-2 ans)", "Confirmé (3-5 ans)", "Senior (6-10 ans)", "Expert (+10 ans)"]
- "objectives" : Choisir 1 ou plusieurs parmi ["Acquisition de clients (B2B/B2C)", "Nouvelle opportunité de poste", "Recherche de partenaires/fonds", "Veille technologique/marché", "Reconversion professionnelle"]
- "environment" : Choisir parmi ["Start-up / Scale-up", "Grand Groupe Entreprise", "PME / TPE", "100% Télétravail / Nomad"]
- "professionalStatus" : Choisir parmi ["Salarié", "Freelance / Indépendant", "Entrepreneur / CEO", "En transition / Recherche", "Étudiant"]

FORMAT JSON ATTENDU STRICT :
{
  "profession": "Titre du poste ou métier principal (Texte libre)",
  "industry": "VALEUR EXACTE PARMI LES CHOIX",
  "seniority": "VALEUR EXACTE PARMI LES CHOIX",
  "professionalStatus": "VALEUR EXACTE PARMI LES CHOIX",
  "environment": "VALEUR EXACTE PARMI LES CHOIX",
  "objectives": ["VALEUR EXACTE 1", "VALEUR EXACTE 2"],
  "workNuances": "Résumé des nuances libres pour la section travail (Texte libre)",
  "ikigaiMission": "Sa mission de vie ou professionnelle déduite (1 phrase)",
  "ikigaiValues": ["Valeur 1", "Valeur 2"],
  "dealbreakers": ["Ce qu'il refuse absolument"],
  "socialStyle": "Introverti, Extraverti, Analytique, etc."
}
`;

        console.log("📡 Envoi des données à Mistral pour assimilation...");
        const chatResponse = await client.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }],
            responseFormat: { type: 'json_object' },
            temperature: 0.2, // Profilage strict
        });

        const rawContent = chatResponse.choices?.[0].message.content;
        if (!rawContent) throw new Error("Réponse vide de Mistral");

        const profileData = JSON.parse(rawContent as string);
        console.log("✅ Matrice générée :", profileData);

        await prisma.profile.update({
            where: { id: userId },
            data: {
                profession: profileData.profession,
                industry: profileData.industry,
                seniority: profileData.seniority,
                professionalStatus: profileData.professionalStatus,
                environment: profileData.environment,
                objectives: profileData.objectives,
                workNuances: profileData.workNuances,
                ikigaiMission: profileData.ikigaiMission,
                ikigaiValues: profileData.ikigaiValues,
                dealbreakers: profileData.dealbreakers,
                socialStyle: profileData.socialStyle,
            }
        });

        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        console.error("Erreur autoIngestProfile:", error);
        return { success: false, error: "Erreur lors de l'assimilation" };
    }
}
