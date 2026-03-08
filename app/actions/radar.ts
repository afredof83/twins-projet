// 'use server' (static build fix)

import { prisma } from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function forceHuntSync(formData?: FormData) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return cookieStore.getAll() } } }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await executeRadarScan(user.id, 'work');
        revalidatePath('/');
    } catch (error: any) {
        console.error("🔥 [RADAR] CRASH:", error.message);
    }
}

export async function executeRadarScan(userId: string, theme: string = 'work') {
    console.log(`📡 [RADAR] Scan IA pour ${userId} (Thème: ${theme})...`);

    try {
        const myProfile = await prisma.profile.findUnique({ where: { id: userId } });
        if (!myProfile) return;

        // Configuration selon le thème
        let embeddingField = "unifiedEmbedding";
        let myBio = myProfile.bio;
        let myRole = myProfile.primaryRole;
        let mySector = myProfile.sector;

        if (theme === 'dating') {
            embeddingField = "social_embedding";
            myBio = myProfile.socialBio;
            myRole = myProfile.socialRole;
            mySector = myProfile.socialSector;
        } else if (theme === 'hobby') {
            embeddingField = "hobby_embedding";
            myBio = myProfile.hobbyBio;
            myRole = myProfile.hobbyRole;
            mySector = myProfile.hobbySector;
        }

        // 1. Extraction du Vecteur de l'utilisateur
        const currentUserRaw: any[] = await prisma.$queryRawUnsafe(`
            SELECT "${embeddingField}"::text as "embedding"
            FROM "Profile" 
            WHERE id = $1
        `, userId);
        const userEmbedding = currentUserRaw[0]?.embedding;

        if (!userEmbedding) {
            console.log(`⚠️ [RADAR] Aucun vecteur trouvé pour ${userId} sur le thème ${theme}.`);
            return;
        }

        // 2. Recherche Cosinus
        const others: any[] = await prisma.$queryRawUnsafe(`
            SELECT 
                id, name, bio, sector,
                primary_role as "primaryRole", 
                social_bio as "socialBio", social_role as "socialRole", social_sector as "socialSector",
                hobby_bio as "hobbyBio", hobby_role as "hobbyRole", hobby_sector as "hobbySector",
                1 - ("${embeddingField}" <=> $1::vector) as similarity
            FROM "Profile"
            WHERE id::text != $2::text 
            AND "${embeddingField}" IS NOT NULL
            AND 1 - ("${embeddingField}" <=> $1::vector) > 0.65
            ORDER BY similarity DESC
            LIMIT 5;
        `, userEmbedding, userId);

        for (const target of others) {
            const existing = await prisma.opportunity.findFirst({
                where: {
                    OR: [
                        { sourceId: userId, targetId: target.id },
                        { sourceId: target.id, targetId: userId }
                    ]
                }
            });
            if (existing) continue;

            const prompt = `Tu es Cortex, une IA de renseignement sémantique. Compare ces deux profils pour évaluer une synergie stratégique.
        
        [MON PROFIL (Utilisateur Courant)]:
        Rôle : ${myRole || 'Non défini'}
        Secteur : ${mySector || 'Non défini'}
        Bio : ${myBio || 'Non spécifié'}

        [CIBLE DÉTECTÉE (${target.name || 'Cible'})]:
        Rôle : ${theme === 'work' ? target.primaryRole : theme === 'dating' ? target.socialRole : target.hobbyRole || 'Non défini'}
        Secteur : ${theme === 'work' ? target.sector : theme === 'dating' ? target.socialSector : target.hobbySector || 'Non défini'}
        Bio : ${theme === 'work' ? target.bio : theme === 'dating' ? target.socialBio : target.hobbyBio || 'Non spécifié'}
        
        Si compatibilité > 60%, donne un score (0-100) et un résumé ultra-bref (15 mots max).
        Directive : Décris la cible. Format JSON: { "score": number, "synergies": "string" }
        RÉPOND UNIQUEMENT ET STRICTEMENT AU FORMAT JSON.`;

            const res = await mistralClient.chat.complete({
                model: 'mistral-small-latest',
                messages: [{ role: 'user', content: prompt }],
                responseFormat: { type: 'json_object' }
            });

            const rawContent = res.choices?.[0]?.message.content;
            try {
                const cleanedContent = typeof rawContent === 'string' ? rawContent.replace(/```json/gi, '').replace(/```/g, '').trim() : '{}';
                const result = JSON.parse(cleanedContent);

                if (result.score && result.score > 60) {
                    await prisma.opportunity.create({
                        data: {
                            sourceId: userId,
                            targetId: target.id,
                            matchScore: result.score,
                            synergies: result.synergies || "Compatibilité détectée.",
                            status: 'DETECTED'
                        }
                    });
                }
            } catch (e) { continue; }
        }
    } catch (error: any) {
        console.error(`❌ [RADAR-EXEC] Error for ${userId}:`, error.message);
    }
}

export async function getRadarResults(profileId: string) {
    try {
        if (!profileId) throw new Error("Missing profile ID");
        const results = await prisma.opportunity.findMany({
            where: {
                targetId: profileId,
                sourceId: { not: profileId },
                status: 'DETECTED'
            },
            include: { sourceProfile: true },
            orderBy: { matchScore: 'desc' }
        });
        return { success: true, results };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getGlobalRadarNews() {
    // Bouchon pour remplacer l'ancienne route /api/radar
    return { success: true, news: [] };
}
