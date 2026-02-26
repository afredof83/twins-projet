import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Mistral } from '@mistralai/mistralai';
import { sendPushNotification } from '@/lib/firebase-admin';
// Importe ton SDK Tavily et Firebase ici plus tard

const prisma = new PrismaClient();
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// Limite de requêtes simultanées pour ne pas exploser les API (Rate Limiting)
const CONCURRENCY_LIMIT = 5;

export async function GET(request: Request) {
    try {
        // 1. DÉTECTION : Trouver tous les radars qui doivent tourner
        // Logique : lastRunAt + (frequency en heures) <= NOW()
        const activeRadars = await prisma.radar.findMany({
            where: { isActive: true },
            include: {
                profile: {
                    select: { id: true, pushToken: true } // On a besoin du token pour la notif
                }
            }
        });

        // --- FILTRE TEMPOREL STRICT (MODE SAAS PRODUCTION) ---
        const now = new Date();
        const radarsToRun = activeRadars.filter(radar => {
            const nextRun = new Date(radar.lastRunAt);
            // On ajoute la fréquence (en heures) à la date de dernière exécution
            nextRun.setHours(nextRun.getHours() + radar.frequency);

            // Le radar ne s'exécute QUE si le cycle de temps est révolu
            return nextRun <= now;
        });
        // -----------------------------------------------------

        if (radarsToRun.length === 0) {
            return NextResponse.json({ message: "Aucun radar n'est arrivé à son heure d'exécution." });
        }

        console.log(`⚡ Démarrage du Manager Loop : ${radarsToRun.length} radars ciblés.`);

        // 2. BATCHING : Exécution asynchrone contrôlée (Par paquets de 5)
        for (let i = 0; i < radarsToRun.length; i += CONCURRENCY_LIMIT) {
            const batch = radarsToRun.slice(i, i + CONCURRENCY_LIMIT);

            await Promise.allSettled(batch.map(async (radar) => {
                try {
                    // A. EXTRACTION DU CONTEXTE (Memories)
                    // Tu devras adapter cette requête selon comment tes memories sont structurées
                    const memories = await prisma.memory.findMany({
                        where: { profileId: radar.profileId },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    });
                    const context = memories.map(m => m.content).join(' | ');

                    // B. RECHERCHE OSINT (Tavily)
                    const searchQuery = `${radar.theme} ${radar.customPrompt || ''}`;
                    console.log(`🔍 [OSINT] Recherche pour ${radar.profileId} : ${searchQuery}`);

                    // Appel direct à l'API REST de Tavily (plus léger que d'installer un SDK complet)
                    const tavilyReq = await fetch('https://api.tavily.com/search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            api_key: process.env.TAVILY_API_KEY,
                            query: searchQuery,
                            search_depth: "advanced", // 'basic' pour aller plus vite, 'advanced' pour la qualité
                            include_raw_content: false,
                            max_results: 5 // On limite pour ne pas exploser la fenêtre de contexte de Mistral
                        })
                    });

                    if (!tavilyReq.ok) {
                        throw new Error(`Erreur Tavily: ${tavilyReq.statusText}`);
                    }

                    const tavilyRes = await tavilyReq.json();

                    // Formatage strict pour le prompt Mistral
                    const osintData = tavilyRes.results
                        .map((r: any) => `Source: ${r.url}\nTitre: ${r.title}\nContenu: ${r.content}`)
                        .join('\n\n');

                    if (!osintData) {
                        console.log(`⚠️ [OSINT] Aucun résultat pertinent trouvé pour ${searchQuery}.`);
                        return; // return au lieu de continue dans un inner map avec Promise.allSettled
                    }

                    // C. SCORING INTRAITABLE (Mistral)
                    const prompt = `
            Tu es un manager d'élite.
            Thème de recherche : ${radar.theme}.
            Contexte client : ${context}.
            Données web trouvées : ${osintData}.
            
            Analyse ces données. Note la meilleure opportunité de 1 à 10.
            Si la note est inférieure à 8, réponds EXACTEMENT : "REJET".
            Si la note est >= 8, réponds EXACTEMENT avec un objet JSON pur. N'ajoute AUCUN texte avant ou après, pas de bloc Markdown, pas de backticks. Uniquement l'objet JSON : {"score": 8, "titre": "...", "action": "..."}
          `;

                    const chatResponse = await mistral.chat.complete({
                        model: 'mistral-small-latest', // Utilise le small pour le tri de masse (moins cher/plus rapide)
                        messages: [{ role: 'user', content: prompt }],
                    });

                    const rawContent = chatResponse.choices?.[0]?.message?.content;
                    let iaDecision = "REJET";

                    // Fix TypeScript : Vérification stricte au runtime
                    if (typeof rawContent === 'string') {
                        iaDecision = rawContent;
                    } else if (Array.isArray(rawContent)) {
                        // Fallback si l'API renvoie des chunks (sécurité future)
                        const textChunk = rawContent.find(chunk => chunk.type === 'text');
                        if (textChunk && 'text' in textChunk) {
                            iaDecision = textChunk.text || "REJET";
                        }
                    }

                    // D. NOTIFICATION TACTIQUE (Firebase)
                    if (iaDecision !== "REJET" && iaDecision.includes("{")) {
                        try {
                            // 1. Nettoyage brutal (Sanitisation) : on arrache le Markdown
                            const cleanJsonString = iaDecision
                                .replace(/```json/g, '')
                                .replace(/```/g, '')
                                .trim();

                            // 2. Parsing sécurisé
                            const opportunite = JSON.parse(cleanJsonString);
                            console.log(`✅ [SUCCÈS IA] Opportunité trouvée : ${opportunite.titre} (Score: ${opportunite.score})`);

                            // On sécurise les données envoyées par l'IA avant de les sauvegarder
                            await prisma.radarResult.create({
                                data: {
                                    title: opportunite.titre || opportunite.title || 'Nouvelle opportunité',
                                    description: opportunite.action || opportunite.description || 'Action à définir',
                                    url: opportunite.url || "https://www.google.com", // 👈 URL de secours si l'IA l'oublie
                                    score: Number(opportunite.score) || 8, // 👈 Force la conversion en VRAI chiffre
                                    radarId: radar.id
                                }
                            });

                            if (radar.profile.pushToken) {
                                console.log(`🚀 [PUSH] Préparation de l'envoi mobile pour ${radar.profileId}`);
                                await sendPushNotification(radar.profile.pushToken, "🎯 Opportunité Détectée", opportunite.titre);
                            } else {
                                console.log(`⚠️ [PUSH] Profil ${radar.profileId} sans pushToken. Notification ignorée.`);
                            }
                        } catch (parseError) {
                            console.error(`❌ [ERREUR PARSING] Mistral a renvoyé un format illisible :`, iaDecision);
                        }
                    }

                    // E. MISE À JOUR DU RADAR
                    await prisma.radar.update({
                        where: { id: radar.id },
                        data: { lastRunAt: new Date() }
                    });

                } catch (error) {
                    console.error(`❌ Erreur sur le radar ${radar.id}:`, error);
                }
            }));
        }

        return NextResponse.json({ success: true, executed: radarsToRun.length });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
