'use server';

import prisma from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function forceHuntSync(formData?: FormData) {
    console.log("📡 [RADAR] Lancement du scan Mistral IA...");

    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return cookieStore.getAll() } } }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log("❌ [RADAR] Non authentifié. Fermeture du scan.");
            return;
        }

        const currentUserId = user.id;
        console.log(`👤 [RADAR] Mon ID Interne (Supabase auth) : ${currentUserId}`);

        const myProfile = await prisma.profile.findUnique({ where: { id: currentUserId } });
        if (!myProfile) {
            console.log("❌ [RADAR] Profil introuvable en BDD.");
            return;
        }

        let others: any[] = [];
        try {
            // Extraction sécurisée de l'embedding courant (qui se trouve dans CortexNote)
            const currentUserRaw: any[] = await prisma.$queryRaw`SELECT embedding::text FROM "CortexNote" WHERE "profileId" = ${currentUserId} LIMIT 1`;
            const userEmbedding = currentUserRaw[0]?.embedding;

            if (userEmbedding) {
                console.log("✅ [RADAR] Lancement de la requête pgvector (Cosinus Distance)...");
                others = await prisma.$queryRaw`
                  SELECT 
                    p.id, 
                    p.name, 
                    p.role, 
                    p.bio, 
                    1 - (c.embedding <=> ${userEmbedding}::vector) as similarity
                  FROM "Profile" p
                  JOIN "CortexNote" c ON c."profileId" = p.id
                  WHERE p.id::text != ${currentUserId} 
                  AND c.embedding IS NOT NULL
                  ORDER BY c.embedding <=> ${userEmbedding}::vector
                  LIMIT 5;
                `;
            } else {
                console.log("⚠️ [RADAR] L'utilisateur courant n'a pas d'embedding, fallback sur une recherche de base...");
                others = await prisma.profile.findMany({
                    where: { NOT: { id: currentUserId } },
                    take: 5
                });
            }
        } catch (error: any) {
            console.error("⚠️ [RADAR] Erreur pgvector, fallback sur findMany :", error.message);
            others = await prisma.profile.findMany({
                where: { NOT: { id: currentUserId } },
                take: 5
            });
        }

        console.log(`🔎 [RADAR] ${others.length} cibles potentielles trouvées.`);

        for (const target of others) {
            // 🛡️ DOUBLE SÉCURITÉ : Au cas où l'ID serait mal passé
            if (target.id === currentUserId) {
                console.log("🚨 [CRITICAL] AUTO-MATCH DETECTE ET BLOQUE !");
                continue;
            }

            const existing = await prisma.opportunity.findFirst({
                where: {
                    OR: [
                        { sourceId: currentUserId, targetId: target.id },
                        { sourceId: target.id, targetId: currentUserId }
                    ]
                }
            });

            if (existing) {
                console.log(`⚠️ [RADAR] On skip ${target.id} car une opportunité existe déjà.`);
                continue;
            }

            console.log(`🤖 [RADAR] Appel Mistral pour match avec la cible validée : ${target.name || target.id}`);

            // APPEL MISTRAL
            const prompt = `Tu es Cortex. Compare ces deux profils pour évaluer une synergie.
        UTILISATEUR COURANT: ${myProfile?.bio} | Role: ${myProfile?.role}
        CIBLE DÉTECTÉE (${target.name || 'Cible'}): ${target.bio} | Role: ${target.role}
        
        Si compatibilité > 60%, donne un score (0-100) et un résumé ultra-bref (15 mots max).
        DIRECTIVE STRICTE POUR LE RÉSUMÉ : Force le prompt à dire : "Voici ${target.name || 'la cible'}. Il/Elle est [Métier de la cible]. Il/Elle cherche [Objectif]." Ne mentionne JAMAIS l'utilisateur connecté.
        Format JSON strict: { "score": number, "summary": "string" }`;

            const res = await mistralClient.chat.complete({
                model: 'mistral-small-latest',
                messages: [{ role: 'user', content: prompt }],
                responseFormat: { type: 'json_object' }
            });

            const content = res.choices?.[0]?.message.content;
            const result = JSON.parse(typeof content === 'string' ? content : '{}');
            const summaryText = result.summary || "Compatibilité stratégique détectée par le Cortex.";

            if (result.score && result.score > 60) {
                const newOpp = await prisma.opportunity.create({
                    data: {
                        sourceId: currentUserId,
                        targetId: target.id,
                        matchScore: result.score,
                        summary: summaryText,
                        status: 'DETECTED'
                    }
                });
                console.log(`✅ [RADAR] Match réussi: ${target.name} à ${result.score}% ! Opportunité ID: ${newOpp.id}`);
            } else {
                console.log(`📉 [RADAR] Échec du match avec ${target.id} (Score: ${result.score || 'Inconnu'})`);
            }
        }
        revalidatePath('/');
    } catch (error: any) {
        console.error("🔥 [RADAR] CRASH:", error.message);
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
