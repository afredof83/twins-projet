'use server'
import { mistralClient } from '@/lib/mistral';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { trackAgentActivity } from '@/app/actions/missions';

export async function executeTerminalCommand(userId: string, prompt: string): Promise<{ success: boolean; answer?: string; targets?: any[]; webResults?: any[]; error?: string }> {
    if (!prompt) throw new Error("Ordre vide.");

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    try {
        // --- 1. CONVERSION DE L'ORDRE EN VECTEUR ---
        const embRes = await mistralClient.embeddings.create({
            model: "mistral-embed",
            inputs: [prompt]
        });
        const queryEmbedding = embRes.data[0].embedding;

        // --- 2. DOUBLE FRAPPE PARALLÈLE ---
        const internalSearch = supabase.rpc('hybrid_search_memories', {
            query_text: prompt,
            query_embedding: queryEmbedding,
            match_threshold: 0.50,
            match_count: 5,
            exclude_profile_id: userId
        });
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

        // --- 4. SYNTHÈSE MISTRAL ---
        const aiPrompt = `
Je suis Ipse, l'unité de ciblage tactique.
Ma mission est d'analyser les résultats de ma base de connaissances et d'extraire la cible la plus pertinente.
Ordre utilisateur : "${prompt}"
CAPTEURS INTERNES :
"""${internalContext}"""
CAPTEURS EXTERNES (Web) :
"""${externalContext}"""
RÈGLES DE CIBLAGE :
1. J'identifie la localisation EXACTE.
2. Je convertis en coordonnées GPS précises.
3. J'utilise le nom réel de la cible.
FORMAT OBLIGATOIRE (Tag caché à la fin) :
[TARGETS: [{"name": "Nom Réel", "lat": 48.6493, "lng": -2.0257}]]
`;

        const response = await mistralClient.chat.complete({
            model: "mistral-large-latest",
            messages: [{ role: "system", content: aiPrompt }]
        });
        const rawContent = (response.choices?.[0].message.content as string) || "";

        // Extraction sécurisée des cibles
        let extractedTargets: any[] = [];
        const targetMatch = rawContent.match(/\[TARGETS:\s*([\s\S]*?)\]/);
        if (targetMatch && targetMatch[1]) {
            try {
                extractedTargets = JSON.parse(targetMatch[1]);
            } catch (e) {
                console.error("Erreur de parsing des coordonnées");
            }
        }
        const cleanAnswer = rawContent.replace(/\[TARGETS:.*?\]/g, '').trim();

        // --- 5. RETOUR DES DONNÉES BRUTES (Curation manuelle via UI) ---
        const webResults = externalData.results || [];

        await trackAgentActivity(userId, 'message');

        return { success: true, answer: cleanAnswer, targets: extractedTargets, webResults };
    } catch (error: any) {
        console.error("[CRASH TERMINAL] :", error);
        return { success: false, error: "Échec critique du terminal tactique." };
    }
}
