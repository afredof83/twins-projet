import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';

// ⚠️ EXCEPTION STRATÉGIQUE : Mode "Dieu" autorisé UNIQUEMENT pour les tâches de fond (Cron)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function GET(request: Request) {
    // 1. SÉCURITÉ : Vérifier que c'est bien Vercel (ou toi) qui lance le Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Accès tactique refusé.' }, { status: 401 });
    }

    console.log("🦇 [RADAR FURTIF] Déploiement de l'escadron nocturne...");

    try {
        // 2. Récupérer tous les profils actifs qui cherchent des opportunités
        const activeAgents = await prisma.profile.findMany({
            where: { objectives: { isEmpty: false } },
            select: { id: true, profession: true, objectives: true }
        });

        for (const agent of activeAgents) {
            if (!agent.profession || agent.objectives.length === 0) continue;

            // 3. Convertir l'objectif de l'agent en Vecteur
            const searchIntent = `Profession: ${agent.profession}. Objectifs: ${agent.objectives.join(', ')}`;
            const embRes = await mistral.embeddings.create({
                model: "mistral-embed",
                inputs: [searchIntent]
            });
            const queryEmbedding = embRes.data[0].embedding;

            // 4. Scanner la base vectorielle globalement (bypass RLS grâce au client Admin)
            const { data: matchedMemories, error } = await supabaseAdmin.rpc('match_network_memories', {
                query_embedding: queryEmbedding,
                match_threshold: 0.85, // Seuil TRÈS élevé : On ne veut réveiller l'utilisateur que pour un sniper shot
                match_count: 1,
                exclude_profile_id: agent.id
            });

            if (error) {
                console.error(`[CRON] Erreur RPC pour l'agent ${agent.id}`, error);
                continue;
            }

            if (matchedMemories && matchedMemories.length > 0) {
                const targetId = matchedMemories[0].profile_id;

                // 5. Générer une notification silencieuse dans la base de données
                // Vérifier d'abord si on n'a pas déjà notifié cette cible récemment
                const existingAlert = await prisma.notification.findFirst({
                    where: { userId: agent.id, targetId: targetId }
                });

                if (!existingAlert) {
                    // Créer l'alerte
                    await prisma.notification.create({
                        data: {
                            userId: agent.id,
                            type: 'RADAR_MATCH',
                            title: 'Cible Haute Valeur Détectée',
                            content: `Le Radar Furtif a trouvé une cible avec un alignement stratégique massif pendant la nuit.`,
                            targetId: targetId,
                            isRead: false
                        }
                    });

                    console.log(`[SUCCÈS] Alerte générée pour l'Agent ${agent.id} vers la cible ${targetId}`);
                }
            }
        }

        return NextResponse.json({ success: true, message: "Ronde nocturne terminée." });

    } catch (error: any) {
        console.error("[CRON ERROR]", error);
        return NextResponse.json({ error: "Échec du radar furtif" }, { status: 500 });
    }
}
