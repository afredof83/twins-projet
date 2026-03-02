'use server';

import prisma from '@/lib/prisma';
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

        const prompt = `Tu es le Cortex de l'application Ipse. Ton rôle est de profiler cet utilisateur pour configurer son Agent B2B autonome.
Fais une synthèse de ce profil en 3 phrases maximum.
Profil: ${JSON.stringify(profile.thematicProfile || {})}
Bio: ${profile.bio || "Non renseignée"}`;

        const response = await mistralClient.chat.complete({
            model: "mistral-large-latest",
            messages: [{ role: "user", content: prompt }]
        });

        const synthesis = response.choices?.[0]?.message.content as string;

        await prisma.profile.update({
            where: { id: profileId },
            data: { unifiedAnalysis: synthesis }
        });

        return { success: true, synthesis };
    } catch (error: any) {
        console.error("❌ [AGENT REFLECT] Error:", error.message);
        return { success: false, error: error.message };
    }
}
