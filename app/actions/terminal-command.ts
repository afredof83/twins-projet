'use server'

import { Mistral } from '@mistralai/mistralai';
import { prisma } from "@/lib/prisma";
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function executeTerminalCommand(userId: string, prompt: string): Promise<{ success: boolean; answer?: string; targets?: any[]; error?: string }> {
    console.log("=========================================");
    console.log("[ALERTE] LA BONNE FONCTION EST EXÉCUTÉE !");
    console.log("Requête de l'utilisateur :", prompt);
    console.log("=========================================");

    if (!prompt) throw new Error("Ordre vide.");

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    try {
        // --- 1. CONVERSION DE L'ORDRE EN VECTEUR ---
        const embRes = await mistral.embeddings.create({
            model: "mistral-embed",
            inputs: [prompt]
        });
        const queryEmbedding = embRes.data[0].embedding;

        // --- 2. DOUBLE FRAPPE PARALLÈLE (Interne + Externe) ---

        // Frappe A : Recherche Interne (Le Sonar Vectoriel qu'on a créé)
        const internalSearch = supabase.rpc('match_network_memories', {
            query_embedding: queryEmbedding,
            match_threshold: 0.50, // On ratisse large pour le terminal
            match_count: 3,
            exclude_profile_id: userId
        });

        // Frappe B : Recherche Externe (Tavily Web Scout)
        // We only execute external search if TAVILY_API_KEY is available.
        let externalSearch: Promise<any> = Promise.resolve({ results: [] });
        if (process.env.TAVILY_API_KEY) {
            externalSearch = fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: process.env.TAVILY_API_KEY,
                    query: `${prompt} profil professionnel OR LinkedIn`,
                    search_depth: "basic",
                    max_results: 3
                })
            }).then(res => res.json()).catch(() => ({ results: [] }));
        }

        // On exécute les deux en même temps pour diviser le temps d'attente par 2
        const [internalRes, externalData] = await Promise.all([internalSearch, externalSearch]);

        // --- 3. FORMATAGE DES DONNÉES POUR L'IA ---
        let internalContext = "Aucune donnée interne trouvée.";
        if (internalRes.data && internalRes.data.length > 0) {
            internalContext = internalRes.data.map((m: any) => `[ID Interne: ${m.profile_id}] - Mémoire: ${m.content}`).join('\n');
        }

        let externalContext = "Aucune donnée externe trouvée.";
        if (externalData.results && externalData.results.length > 0) {
            externalContext = externalData.results.map((r: any) => `[Web] ${r.title}\nURL: ${r.url}\nExtrait: ${r.content}`).join('\n\n');
        }

        // --- 4. SYNTHÈSE MISTRAL (L'Agent te parle) ---
        const aiPrompt = `
    Tu es l'unité de ciblage d'un système radar Deep Tech. 
    Ta mission est d'analyser les résultats de la base de données (RAG) et d'extraire la cible la plus pertinente.
    Ton utilisateur t'a donné cet ordre : "${prompt}"

    RAPPORT DES CAPTEURS INTERNES (Base de données Twins) :
    """${internalContext}"""

    RAPPORT DES CAPTEURS EXTERNES (Web / Tavily) :
    """${externalContext}"""

    RÈGLES DE CIBLAGE GÉOSPATIAL (CRITIQUE) :
    1. Identifie la localisation EXACTE de la cible dans les données (Ville ou Pays).
    2. Convertis cette localisation en coordonnées GPS réelles (Latitude et Longitude). 
    3. INTERDICTION FORMELLE d'utiliser Paris (48.85, 2.35) par défaut. Si la cible est à Saint-Malo, donne les coordonnées de Saint-Malo. Si c'est le Canada, donne les coordonnées du centre du Canada.
    4. INTERDICTION d'utiliser le mot "Cible" pour le nom. Utilise le VRAI nom du profil trouvé.

    FORMAT DE RÉPONSE OBLIGATOIRE :
    À la fin de ton analyse textuelle, tu DOIS inclure ce tag exact, sans aucun autre formatage autour :
    [TARGETS: [{"name": "Nom Réel de la Cible", "lat": 48.6493, "lng": -2.0257}]]
    `;

        console.log("[ETAPE 1] Envoi de la requête à Mistral...");
        const response = await mistral.chat.complete({
            model: "mistral-large-latest",
            messages: [{ role: "system", content: aiPrompt }]
        });
        console.log("[ETAPE 2] Réponse reçue de Mistral.");

        const rawContent = (response.choices?.[0].message.content as string) || "";
        console.log("[MISTRAL RAW OUTPUT] :", rawContent);

        // Extraction balistique du JSON caché
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let extractedTargets: any[] = [];
        // Accepte les sauts de ligne si Mistral formate mal sa réponse
        const targetMatch = rawContent.match(/\[TARGETS:\s*([\s\S]*?)\]/);
        if (targetMatch && targetMatch[1]) {
            try {
                extractedTargets = JSON.parse(targetMatch[1]);
            } catch (e) {
                console.error("Erreur de décodage des coordonnées");
            }
        }

        // On nettoie le message pour ne pas afficher le tag [TARGETS: ...] à l'utilisateur
        const cleanAnswer = rawContent.replace(/\[TARGETS:.*?\]/g, '').trim();

        return { success: true, answer: cleanAnswer, targets: extractedTargets };

    } catch (error: any) {
        console.error("[CRASH BACKEND CRITIQUE] :", error);
        return { success: false, error: "Échec critique du terminal tactique." };
    }
}
