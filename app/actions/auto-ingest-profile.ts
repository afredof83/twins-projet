'use server'
import { mistralClient } from "@/lib/mistral";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function extractTextFromUpload(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) throw new Error("Fichier manquant");
        const text = await file.text();
        return { success: true, extractedText: text };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 1. PHASE D'EXTRACTION (Ne touche pas à la DB)
export async function extractProfileData(rawData: string) {
    try {
        const prompt = `
    Tu es le Cortex de l'application Ipse. Ton rôle est de profiler cet utilisateur pour configurer son Agent B2B autonome.
    DONNÉES : """${rawData}"""
    
    FORMAT JSON ATTENDU STRICT :
    {
      "primaryRole": "Titre du poste (Texte)",
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
            temperature: 0.1,
        });

        const rawContent = chatResponse.choices?.[0].message.content;
        if (!rawContent) throw new Error("Réponse vide de Mistral");

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

// 2. PHASE D'INJECTION (Avec génération du Vecteur 1024 de Mistral)
export async function confirmProfileIngestion(userId: string, validatedData: any) {
    try {
        // 1. On sauvegarde d'abord les données texte classiques via Prisma
        await prisma.profile.update({
            where: { id: userId },
            data: {
                primaryRole: validatedData.primaryRole,
                thematicProfile: {
                    industry: validatedData.industry,
                    seniority: validatedData.seniority,
                    objectives: validatedData.objectives,
                    ikigaiMission: validatedData.ikigaiMission,
                    socialStyle: validatedData.socialStyle,
                },
            }
        });

        // 2. ⚡ GÉNÉRATION DE L'EMBEDDING (Le moteur du Radar)
        // On crée un texte riche qui représente parfaitement l'utilisateur pour le Radar
        const textToEmbed = `Profil: ${validatedData.primaryRole}. Secteur: ${validatedData.industry}. Niveau: ${validatedData.seniority}. Objectifs: ${validatedData.objectives.join(', ')}. Mission: ${validatedData.ikigaiMission}.`;

        const embeddingsResponse = await mistralClient.embeddings.create({
            model: 'mistral-embed', // Modèle obligatoire pour les vecteurs
            inputs: [textToEmbed],
        });

        const embeddingVector = embeddingsResponse.data[0].embedding;

        // 3. ⚡ SAUVEGARDE DU VECTEUR DANS POSTGRESQL (Prisma requiert $executeRaw pour pgvector)
        // Note: Mistral génère des vecteurs à 1024 dimensions.
        await prisma.$executeRaw`
            UPDATE "Profile" 
            SET "unifiedEmbedding" = ${embeddingVector}::vector 
            WHERE id = ${userId}
        `;

        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        console.error("Erreur confirmProfileIngestion:", error);
        return { success: false, error: "Erreur lors de l'enregistrement en DB." };
    }
}
