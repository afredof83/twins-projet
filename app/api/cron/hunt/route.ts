import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        // En Vercel Cron, on vérifie l'en-tête d'autorisation pour sécuriser la route
        const authHeader = req.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 });
        }

        // 1. Récupérer tous les profils avec un rôle défini
        const profiles = await prisma.profile.findMany({
            where: { role: { not: null } }
        });

        const results = [];

        // 2. Pour chaque profil, lancer une chasse (ici, en série pour ne pas surcharger les APIs, mais paramétrable)
        for (const profile of profiles) {
            if (!profile.role) continue;

            // TAVILY SCAN
            const query = `Missions freelance ou offres d'emploi pour ${profile.role} ${profile.bio || ''}`;
            const tavilyRes = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: process.env.TAVILY_API_KEY,
                    query: query,
                    search_depth: "advanced",
                    max_results: 5
                })
            });
            const searchResults = await tavilyRes.json();

            // S'il n'y a pas de résultats, on passe au suivant
            if (!searchResults.results) continue;

            // MISTRAL ANALYSIS
            for (const job of searchResults.results) {
                const analysis = await fetch('https://api.mistral.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'mistral-small-latest',
                        messages: [
                            {
                                role: 'system',
                                content: `Tu es un recruteur expert. Compare ce profil : "${profile.bio || profile.role}" avec cette offre : "${job.content}". 
                                Renvoie UNIQUEMENT un objet JSON strictement formaté comme ça: {"score": 85, "reason": "La raison très courte"}`
                            },
                        ],
                        response_format: { type: "json_object" }
                    })
                });

                const res = await analysis.json();

                try {
                    const aiContent = res.choices[0].message.content;
                    const parsed = JSON.parse(aiContent);
                    const score = parseInt(parsed.score, 10);

                    // On ne sauvegarde que les matchs pertinents (ex: > 60%)
                    if (score > 60) {
                        const discovery = await prisma.discovery.create({
                            data: {
                                profileId: profile.id,
                                title: job.title,
                                company: "Source Web", // On pourrait demander à Mistral d'extraire l'entreprise
                                score: score,
                                reason: parsed.reason,
                                url: job.url
                            }
                        });
                        results.push(discovery);

                        // Si le score est > 80%, on pourrait déclencher l'API de Push Firebase ici
                        if (score >= 80) {
                            console.log(`🚀 TOP OPPORTUNITÉ pour ${profile.email}: ${job.title} (${score}%)`);
                            // ex: await sendPushNotification(profile.id, "Nouveau Match", `Match à ${score}%: ${job.title}`);
                        }
                    }
                } catch (e) {
                    console.error("Erreur de parsing Mistral JSON", e);
                }
            }
        }

        return NextResponse.json({ success: true, newDiscoveries: results.length });

    } catch (error) {
        console.error("[CRON HUNTER ERROR]", error);
        return NextResponse.json({ error: "Échec du Cron Job" }, { status: 500 });
    }
}
