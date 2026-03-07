// 'use server' (static build fix)

import { prisma } from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';

// GET AGENT PROFILE
export async function getAgentProfile(profileId: string) {
    try {
        if (!profileId) throw new Error("ID du profil manquant.");
        const profile = await prisma.profile.findUnique({
            where: { id: profileId }
        });

        if (!profile) throw new Error("Profil introuvable");
        return { success: true, profile };
    } catch (error: any) {
        console.error("❌ [AGENT GET] Error:", error.message);
        return { success: false, error: error.message };
    }
}

// UPDATE AGENT PROFILE
export async function updateAgentProfile(data: any) {
    try {
        const { profileId, country, dateOfBirth, postalCode, city, gender, thematicProfile } = data;

        if (!profileId) throw new Error("ID du profil manquant");

        // Extraire top-level properties from thematicProfile if needed
        const industry = thematicProfile?.travail?.industry || null;
        const seniority = thematicProfile?.travail?.seniority || null;
        const professionalStatus = thematicProfile?.travail?.professionalStatus || null;
        const environment = thematicProfile?.travail?.environment || null;
        let objectives = [];
        if (thematicProfile?.travail?.objectives) {
            objectives.push(thematicProfile.travail.objectives);
        }

        await prisma.profile.update({
            where: { id: profileId },
            data: {
                // We do not have country, dateOfBirth, postalCode, city, gender in the current Prisma schema
                // But we can store them in thematicProfile JSON, or just overwrite the JSON field
                thematicProfile,
                profession: professionalStatus,
            },
        });

        return { success: true };
    } catch (error: any) {
        console.error("❌ [AGENT UPDATE] Error:", error.message);
        return { success: false, error: error.message };
    }
}

// REFLECT AGENT
export async function reflectAgent(profileId: string) {
    try {
        if (!profileId) throw new Error("ID du profil manquant");
        const profile = await prisma.profile.findUnique({ where: { id: profileId } });
        if (!profile) throw new Error("Profil introuvable");

        // 1. Synthèse Cognitive (Texte)
        const prompt = `Tu es le Cortex de l'application Ipse. Ton rôle est de profiler cet utilisateur pour configurer son Agent B2B autonome.
Fais une synthèse de ce profil en 3 phrases maximum. 
Concentre-toi sur son expertise, sa séniorité et son objectif.
Profil: ${JSON.stringify(profile.thematicProfile || {})}
Bio: ${profile.bio || "Non renseignée"}`;

        const response = await mistralClient.chat.complete({
            model: "mistral-large-latest",
            messages: [{ role: "user", content: prompt }]
        });

        const synthesis = response.choices?.[0]?.message.content as string;

        // ⚡ ANTIGRAVITY: Vectorisation de l'identité unifiée
        const embedResponse = await mistralClient.embeddings.create({
            model: "mistral-embed", // Format 1024 dimensions
            inputs: [synthesis]
        });
        const masterVector = embedResponse.data[0].embedding;

        // 2. Sauvegarde des métadonnées classiques
        await prisma.profile.update({
            where: { id: profileId },
            data: { unifiedAnalysis: synthesis }
        });

        // 3. Injection chirurgicale du Vecteur Maître (bypass Prisma limit sur les arrays de vecteurs)
        await prisma.$executeRaw`
            UPDATE "Profile"
            SET "unifiedEmbedding" = ${masterVector}::vector
            WHERE id = ${profileId}
        `;

        return { success: true, synthesis };
    } catch (error: any) {
        console.error("❌ [AGENT REFLECT] Erreur:", error.message);
        return { success: false, error: error.message };
    }
}
