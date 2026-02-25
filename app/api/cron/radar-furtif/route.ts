import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { mistralClient } from '@/lib/mistral';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    // 1. SÉCURITÉ : Validation du CRON_SECRET (avec bypass strict pour le dev local)
    const authHeader = request.headers.get('authorization');
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Accès tactique refusé.' }, { status: 401 });
    }

    console.log("🦇 [RADAR FURTIF] Déploiement de l'escadron nocturne...");

    try {
        const activeAgents = await prisma.profile.findMany({
            where: { objectives: { isEmpty: false } },
            select: { id: true, profession: true, objectives: true }
        });

        let matchCount = 0;
        for (const agent of activeAgents) {
            if (!agent.profession || agent.objectives.length === 0) continue;

            const searchIntent = `Profession: ${agent.profession}. Objectifs: ${agent.objectives.join(', ')}`;
            const embRes = await mistralClient.embeddings.create({
                model: "mistral-embed",
                inputs: [searchIntent]
            });
            const queryEmbedding = embRes.data[0].embedding;

            // Seuil abaissé à 0.75 pour détecter de vraies opportunités
            const { data: matchedMemories, error } = await supabaseAdmin.rpc('match_network_memories', {
                query_embedding: queryEmbedding,
                match_threshold: 0.75,
                match_count: 1,
                exclude_profile_id: agent.id
            });

            if (error) {
                console.error(`[CRON] Erreur RPC pour l'agent ${agent.id}`, error);
                continue;
            }

            if (matchedMemories && matchedMemories.length > 0) {
                const targetId = matchedMemories[0].profile_id;

                const existingAlert = await prisma.notification.findFirst({
                    where: { userId: agent.id, targetId: targetId }
                });

                if (!existingAlert) {
                    await prisma.notification.create({
                        data: {
                            userId: agent.id,
                            type: 'RADAR_MATCH',
                            title: 'Cible Haute Valeur Détectée',
                            content: `Le Radar Furtif a trouvé une cible stratégique pendant la nuit. ID: ${targetId}`,
                            targetId: targetId,
                            isRead: false
                        }
                    });
                    console.log(`[SUCCÈS] Alerte générée pour l'Agent ${agent.id} vers la cible ${targetId}`);
                    matchCount++;
                }
            }
        }

        return NextResponse.json({ success: true, message: `Ronde terminée. ${matchCount} nouvelles alertes.` });

    } catch (error: any) {
        console.error("[CRON ERROR]", error);
        return NextResponse.json({ error: "Échec du radar furtif" }, { status: 500 });
    }
}
