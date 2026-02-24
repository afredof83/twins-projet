'use server'

import { Mistral } from '@mistralai/mistralai';
import { prisma } from "@/lib/prisma";
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function executeTerminalCommand(userId: string, prompt: string) {
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
    Tu es MISTRAL-TWIN, le Jumeau Numérique et Agent Tactique.
    Ton utilisateur t'a donné cet ordre : "${prompt}"

    RAPPORT DES CAPTEURS INTERNES (Base de données Twins) :
    """${internalContext}"""

    RAPPORT DES CAPTEURS EXTERNES (Web / Tavily) :
    """${externalContext}"""

    MISSION :
    Réponds directement à l'utilisateur de manière ultra-concise, froide et professionnelle.
    - Analyse les résultats.
    - S'il y a des matchs internes, mets-les en priorité absolue.
    - S'il y a des profils externes intéressants, résume-les et donne les liens (URL).
    - Ne génère pas de JSON, réponds en texte formaté clair (Markdown autorisé).
    `;

        const response = await mistral.chat.complete({
            model: "mistral-large-latest",
            messages: [{ role: "system", content: aiPrompt }]
        });

        return { success: true, answer: response.choices?.[0].message.content };

    } catch (error: any) {
        console.error("[TERMINAL ERROR]", error);
        return { success: false, error: "Échec critique du terminal tactique." };
    }
}
