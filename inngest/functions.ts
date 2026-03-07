// inngest/functions.ts
import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { mistralClient } from "@/lib/mistral";

export const processRadarMatch = inngest.createFunction(
    {
        id: "process-radar-match",
        // ⚡ ANTIGRAVITY : Si Mistral crash, Inngest réessaiera automatiquement jusqu'à 3 fois avec un délai exponentiel.
        retries: 3
    },
    { event: "radar/process.user" },
    async ({ event, step }) => {
        const { userId } = event.data;

        // Étape 1 : Récupérer le Vecteur Maître
        const targetUser = await step.run("fetch-user-vector", async () => {
            const raw: any[] = await prisma.$queryRaw`
         SELECT id, name, role, bio, "unifiedEmbedding"::text 
         FROM "Profile" 
         WHERE id = ${userId}
       `;
            return raw[0] || null;
        });

        if (!targetUser?.unifiedEmbedding) return { status: "no_vector_skipped" };

        // Étape 2 : Lancer la recherche Cosinus
        const matches = await step.run("find-cosine-matches", async () => {
            const results: any[] = await prisma.$queryRaw`
         SELECT 
           id, name, role, bio,
           1 - ("unifiedEmbedding" <=> ${targetUser.unifiedEmbedding}::vector) as similarity
         FROM "Profile"
         WHERE id::text != ${userId}::text 
         AND "unifiedEmbedding" IS NOT NULL
         ORDER BY "unifiedEmbedding" <=> ${targetUser.unifiedEmbedding}::vector
         LIMIT 5;
       `;
            return results;
        });

        if (matches.length === 0) return { status: "no_matches_found" };

        // Étape 3 : Pour chaque match, générer un résumé et créer l'opportunité
        for (const target of matches) {
            // Vérifier qu'une opportunité n'existe pas déjà
            const existing = await step.run(`check-existing-${target.id}`, async () => {
                return prisma.opportunity.findFirst({
                    where: {
                        OR: [
                            { sourceId: userId, targetId: target.id },
                            { sourceId: target.id, targetId: userId }
                        ]
                    }
                });
            });

            if (existing) continue;

            // Générer le résumé via Mistral
            const result = await step.run(`mistral-match-${target.id}`, async () => {
                const prompt = `Tu es Cortex. Compare ces deux profils pour évaluer une synergie.
UTILISATEUR COURANT: ${targetUser.bio} | Role: ${targetUser.role}
CIBLE DÉTECTÉE (${target.name || 'Cible'}): ${target.bio} | Role: ${target.role}

Si compatibilité > 60%, donne un score (0-100) et un résumé ultra-bref (15 mots max).
DIRECTIVE STRICTE POUR LE RÉSUMÉ : Décris uniquement "${target.name || 'la cible'}". Ne mentionne JAMAIS l'utilisateur connecté.
Format JSON strict: { "score": number, "summary": "string" }`;

                const res = await mistralClient.chat.complete({
                    model: 'mistral-small-latest',
                    messages: [{ role: 'user', content: prompt }],
                    responseFormat: { type: 'json_object' }
                });

                const content = res.choices?.[0]?.message.content;
                return JSON.parse(typeof content === 'string' ? content : '{}');
            });

            if (result.score && result.score > 60) {
                await step.run(`save-opportunity-${target.id}`, async () => {
                    await prisma.opportunity.create({
                        data: {
                            sourceId: userId,
                            targetId: target.id,
                            matchScore: result.score,
                            summary: result.summary || "Compatibilité stratégique détectée par le Cortex.",
                            status: 'DETECTED'
                        }
                    });
                });
            }
        }

        return { status: "success", userId, matchesFound: matches.length };
    }
);
