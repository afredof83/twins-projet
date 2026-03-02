'use server'
import { mistralClient } from "@/lib/mistral";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// 1. PHASE D'EXTRACTION (Ne touche pas à la DB)
export async function extractProfileData(rawData: string) {
    try {
        const prompt = `
    Tu es le Cortex de l'application Ipse. Ton rôle est de profiler cet utilisateur pour configurer son Agent B2B autonome.
    DONNÉES : """${rawData}"""
    
    FORMAT JSON ATTENDU STRICT :
    {
      "profession": "Titre du poste (Texte)",
      "industry": "Tech & Data|Commerce & Vente|Marketing & Design|Finance & Crypto",
      "seniority": "Junior (0-2 ans)|Confirmé (3-5 ans)|Senior (6-10 ans)|Expert (+10 ans)",
      "objectives": ["Objectif 1", "Objectif 2"],
      "ikigaiMission": "Sa mission de vie déduite (1 phrase)",
      "socialStyle": "Introverti|Extraverti|Analytique"
    }
    `;

        const chatResponse = await mistralClient.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }],
            responseFormat: { type: 'json_object' },
            temperature: 0.1, // Extrêmement bas pour éviter les hallucinations
        });

        const rawContent = chatResponse.choices?.[0].message.content;
        if (!rawContent) throw new Error("Réponse vide de Mistral");

        // Sécurisation stricte du parsing
        let profileData;
        try {
            profileData = JSON.parse(rawContent as string);
        } catch (parseError) {
            throw new Error("L'IA a généré un JSON corrompu.");
        }

        return { success: true, data: profileData };
    } catch (error: any) {
        console.error("Erreur extractProfileData:", error);
        return { success: false, error: error.message };
    }
}

// 2. PHASE D'INJECTION (Après validation humaine)
export async function confirmProfileIngestion(userId: string, validatedData: any) {
    try {
        await prisma.profile.update({
            where: { id: userId },
            data: {
                profession: validatedData.profession,
                thematicProfile: {
                    industry: validatedData.industry,
                    seniority: validatedData.seniority,
                    objectives: validatedData.objectives,
                    ikigaiMission: validatedData.ikigaiMission,
                    socialStyle: validatedData.socialStyle,
                },
            }
        });

        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erreur lors de l'enregistrement en DB." };
    }
}