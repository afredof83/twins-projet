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

        const myId = user.id;
        console.log(`👤 [RADAR] Mon ID Interne (Supabase auth) : ${myId}`);

        const myProfile = await prisma.profile.findUnique({ where: { id: myId } });
        if (!myProfile) {
            console.log("❌ [RADAR] Profil introuvable en BDD.");
            return;
        }

        const others = await prisma.profile.findMany({
            where: { NOT: { id: myId } },
            take: 3 // On limite pour le test Mistral
        });

        console.log(`🔎 [RADAR] ${others.length} cibles potentielles trouvées.`);

        for (const target of others) {
            // 🛡️ DOUBLE SÉCURITÉ : Au cas où l'ID serait mal passé
            if (target.id === myId) continue;

            // On évite de recréer si ça existe déjà (peu importe qui est la source)
            const existing = await prisma.opportunity.findFirst({
                where: {
                    OR: [
                        { sourceId: myId, targetId: target.id },
                        { sourceId: target.id, targetId: myId }
                    ]
                }
            });

            if (existing) {
                console.log(`⚠️ [RADAR] On skip ${target.id} car une opportunité existe déjà.`);
                continue;
            }

            console.log(`🤖 [RADAR] Appel Mistral pour match avec : ${target.id}`);

            // APPEL MISTRAL
            const prompt = `Compare deux profils d'agents :
        AGENT A: ${myProfile?.bio} | Role: ${myProfile?.role}
        AGENT B: ${target.bio} | Role: ${target.role}
        Si compatibilité > 60%, donne un score (0-100) et un résumé (10 mots max).
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
                        sourceId: myId,
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
