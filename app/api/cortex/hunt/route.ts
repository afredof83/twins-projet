import { NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';

import prisma from '@/lib/prisma';
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// Fonction utilitaire pour calculer la similarité cosinus entre deux vecteurs
function cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function POST(req: Request) {
    try {
        // 1. On récupère le profil de l'utilisateur qui lance la chasse
        const { userId } = await req.json();
        const profile = await prisma.profile.findUnique({ where: { id: userId } });

        if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

        const profileText = `${profile.customRole || profile.role || ''} ${profile.bio || ''} ${profile.tjm ? `TJM/Tarif: ${profile.tjm}` : ''}`;

        // 1.5. On génère l'embedding du profil s'il n'existe pas (ici on force la génération pour être à jour)
        const profileEmbeddingRes = await mistral.embeddings.create({
            model: "mistral-embed",
            inputs: [profileText],
        });
        const profileEmbedding = profileEmbeddingRes.data[0].embedding;

        // Mise à jour de l'embedding dans la base de données (Note: Prisma ne supporte pas bien l'insertion d'Unsupported(vector) directement via l'ORM standard
        // On utiliserait une query raw pour cela, ex: await prisma.$executeRaw`UPDATE "Profile" SET embedding = ${profileEmbedding}::vector WHERE id = ${userId}`
        // Pour la "Chasse", on utilise l'embedding généré à la volée

        // 2. TAVILY SCAN : On cherche des opportunités sur le web
        const query = `Opportunités professionnelles, missions ou offres d'emploi récentes pour ${profile.customRole || profile.role} ${profile.bio}`;
        const tavilyRes = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: process.env.TAVILY_API_KEY,
                query: query,
                search_depth: "advanced",
                max_results: 5,
                include_raw_content: true // Demander plus de contexte si possible
            })
        });
        const searchResults = await tavilyRes.json();

        if (!searchResults.results) {
            return NextResponse.json({ matches: [] });
        }

        // 3. MISTRAL ANALYSIS : Pour chaque résultat, on calcule l'embedding et on compare
        const matches = await Promise.all(searchResults.results.map(async (job: any) => {
            const jobText = `${job.title} ${job.content}`;

            // Embedding de l'offre
            const jobEmbeddingRes = await mistral.embeddings.create({
                model: "mistral-embed",
                inputs: [jobText],
            });
            const jobEmbedding = jobEmbeddingRes.data[0].embedding;

            // Calcul de la similarité (0 à 1)
            const similarity = cosineSimilarity(profileEmbedding as number[], jobEmbedding as number[]);
            const score = Math.round(similarity * 100);

            // On demande à Mistral une raison courte pour les bons scores (> 60%)
            let reason = "Analyse mathématique vectorielle pertinente.";
            if (score > 60) {
                const analysisRes = await mistral.chat.complete({
                    model: 'mistral-small-latest',
                    messages: [
                        { role: 'system', content: `Compare ce profil : "${profileText}" avec cette offre : "${jobText}". Donne en UNE seule phrase courte (max 15 mots) la raison du match.` },
                    ]
                });
                const responseContent = analysisRes.choices?.[0]?.message?.content;
                if (typeof responseContent === 'string') {
                    reason = responseContent.replace(/^["']|["']$/g, '');
                }
            }

            return {
                title: job.title,
                url: job.url,
                score: score,
                reason: reason,
                company: job.url ? new URL(job.url).hostname.replace('www.', '') : 'Web'
            };
        }));

        // 4. Filtrage et sauvegarde des meilleures trouvailles (> 65%)
        const goodMatches = matches.filter(m => m.score > 65);

        for (const match of goodMatches) {
            // Éviter les doublons simples basés sur l'URL
            const existing = await prisma.discovery.findFirst({
                where: { profileId: userId, url: match.url }
            });

            if (!existing) {
                await prisma.discovery.create({
                    data: {
                        profileId: userId,
                        title: match.title.substring(0, 255), // Limiter taille
                        score: match.score,
                        reason: match.reason.substring(0, 255),
                        url: match.url,
                        company: match.company,
                    }
                });
            }
        }

        return NextResponse.json({ matches: goodMatches });

    } catch (error) {
        console.error("[HUNTER ERROR]", error);
        return NextResponse.json({ error: "Échec de la chasse" }, { status: 500 });
    }
}
