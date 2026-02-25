import { mistralClient } from "@/lib/mistral";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const mistral = mistralClient;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export async function POST(req: Request) {
    try {
        const { profileId } = await req.json();
        if (!profileId) throw new Error("ID de l'Agent manquant.");

        console.log(`🦇 [ÉCLAIREUR] Réveil de l'Agent ${profileId}...`);

        // 1. Charger l'ADN de l'Agent (La Matrice statique)
        const agent = await prisma.profile.findUnique({
            where: { id: profileId },
            select: { name: true, thematicProfile: true }
        });

        if (!agent || !agent.thematicProfile) {
            throw new Error("L'Agent n'a pas de Matrice Psychologique configurée.");
        }

        // 🟢 NOUVEAU : 1.5. Extraction des fragments du CORTEX (La Mémoire dynamique)
        let cortexData = "";
        try {
            // On récupère les 5 derniers fragments de mémoire de l'Agent
            const memories = await prisma.memory.findMany({
                where: { profileId: profileId },
                orderBy: { createdAt: 'desc' },
                take: 5
            });
            cortexData = memories.map((m: any) => m.content).join(" | ");
            console.log(`🧠 [CORTEX] ${memories.length} fragments mémoriels chargés.`);
        } catch (e) {
            console.log("⚠️ [CORTEX] Impossible de lire la mémoire, continuation avec la matrice seule.");
        }

        const matrice = agent.thematicProfile as any;

        // On fusionne la Matrice (statique) et le Cortex (dynamique)
        const searchContext = `
            Profil de base : ${matrice.travail?.secteur || ''}, rythme ${matrice.travail?.rythme || ''}, passionné par ${matrice.loisirs?.passion || ''}.
            Pensées et souvenirs récents (CORTEX) : ${cortexData || 'Aucun souvenir récent.'}
        `;

        // 2. Demander à Mistral de formuler la requête de recherche idéale
        console.log(`🧠 [ÉCLAIREUR] Analyse du Cortex et génération de la cible...`);
        const queryPrompt = `Tu es l'analyste IA de ${agent.name || "l'Opérateur"}. 
Voici le contexte complet de ton Opérateur :
${searchContext}

En te basant SURTOUT sur les "Pensées et souvenirs récents", génère UNE SEULE requête de recherche web (max 6 mots) pour trouver une opportunité (événement, outil, article stratégique) qui répond à ses préoccupations actuelles. Ne renvoie QUE la requête, sans aucun autre mot.`;

        const queryResponse = await mistral.chat.complete({
            model: 'mistral-small-latest',
            messages: [{ role: 'system', content: queryPrompt }],
        });

        const queryContent = queryResponse.choices?.[0]?.message?.content;
        let searchQuery = (typeof queryContent === 'string' ? queryContent.trim() : "opportunités technologiques") || "opportunités technologiques";

        // 🟢 CORRECTIF 1 : On pulvérise les guillemets que Mistral aurait pu ajouter
        searchQuery = searchQuery.replace(/^["']|["']$/g, '');
        console.log(`🌐 [ÉCLAIREUR] Cible verrouillée et nettoyée : "${searchQuery}"`);

        // 3. Scanner le Web avec Tavily
        const tavilyRes = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: TAVILY_API_KEY,
                query: searchQuery,
                search_depth: "basic",
                include_answer: true,
                max_results: 3
            })
        });
        const tavilyData = await tavilyRes.json();

        // 🟢 CORRECTIF 2 : Vérification stricte des résultats
        const hasResults = tavilyData.results && tavilyData.results.length > 0;
        const webResults = hasResults ? JSON.stringify(tavilyData.results) : "AUCUN RÉSULTAT";

        // 4. Mistral analyse les résultats
        console.log(`🧠 [ÉCLAIREUR] Analyse des données brutes (Résultats trouvés : ${hasResults})...`);
        const analysisPrompt = `Tu es l'analyste IA de ${agent.name || "l'Opérateur"}. Voici son contexte : ${JSON.stringify(matrice)}.
Voici les résultats bruts extraits d'internet : ${webResults}.

MISSION : Choisis la meilleure opportunité PARMI CES RÉSULTATS.
Tu dois ABSOLUMENT répondre dans ce format JSON exact :
{
  "title": "Titre clair de l'opportunité",
  "sourceUrl": "Le lien URL EXACT fourni dans les résultats",
  "reasoning": "Pourquoi c'est pertinent (2 phrases max).",
  "priority": 8
}

RÈGLES STRICTES DE SÉCURITÉ :
1. NE JAMAIS INVENTER DE LIEN URL. Tu ne dois utiliser qu'une URL présente dans les résultats web.
2. Si les résultats sont "AUCUN RÉSULTAT" ou non pertinents, renvoie un JSON avec priority 1, title "Rapport de zone : Aucun contact", reasoning "La cible '${searchQuery}' n'a renvoyé aucune opportunité fiable sur le réseau.", et mets "https://google.com/search?q=${encodeURIComponent(searchQuery)}" comme sourceUrl.`;

        const analysisResponse = await mistral.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: analysisPrompt }],
            responseFormat: { type: 'json_object' }
        });

        const analysisContent = analysisResponse.choices?.[0]?.message?.content;
        const rawContent = typeof analysisContent === 'string' ? analysisContent : undefined;
        if (!rawContent) throw new Error("Échec de l'analyse Mistral.");

        const opportunityData = JSON.parse(rawContent);

        // 5. Sauvegarde dans la base de données
        console.log(`💾 [ÉCLAIREUR] Opportunité qualifiée. Sauvegarde en cours...`);
        const savedOpp = await prisma.opportunity.create({
            data: {
                profileId: profileId,
                title: opportunityData.title,
                sourceUrl: opportunityData.sourceUrl,
                reasoning: opportunityData.reasoning,
                priority: opportunityData.priority
            }
        });

        return NextResponse.json({ success: true, opportunity: savedOpp });

    } catch (error: any) {
        console.error("❌ [ÉCLAIREUR ERROR]", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
