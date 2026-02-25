import { mistralClient } from "@/lib/mistral";
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import * as cheerio from 'cheerio';

// Initialisation
const mistral = mistralClient;

export async function POST(req: Request) {
    try {
        const { url, category } = await req.json();

        // 1. Authentifier l'utilisateur
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; }
                }
            }
        );

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const profileId = user.id;

        console.log(`🧠 [CORTEX] Ingestion lancée pour : ${url} (User: ${profileId})`);

        // Ajout d'une vérification basique de l'URL
        if (!url) throw new Error("URL manquante");

        // 1. SCRAPING (L'Œil)
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CortexBot/1.0)' } });
        if (!response.ok) throw new Error(`Site inaccessible: ${response.status}`);
        const html = await response.text();
        const $ = cheerio.load(html);

        // Nettoyage violent
        $('script, style, nav, footer, iframe, noscript, header').remove();
        let cleanText = $('body').text().replace(/\s+/g, ' ').trim();

        // On garde les 6000 premiers caractères pour le résumé
        const textToProcess = cleanText.substring(0, 6000);

        // 2. SYNTHÈSE (L'Esprit) - On demande à Mistral de structurer la data
        const summaryResponse = await mistral.chat.complete({
            model: "mistral-large-latest",
            messages: [{
                role: "user",
                content: `Analyse ce contenu web et extrais les points stratégiques clés pour Frédéric Rey (Projet Twins/FisherMade).
        Contenu : ${textToProcess}
        
        Format attendu : Résumé dense des faits, chiffres clés, noms de produits, technologies.`
            }]
        });

        const summary = summaryResponse.choices?.[0].message.content || cleanText;

        // 3. VECTORISATION (L'Ancrage)
        const embeddingResponse = await mistral.embeddings.create({
            model: "mistral-embed",
            inputs: [`[SOURCE: ${url}] ${summary}`],
        });
        const vector = embeddingResponse.data[0].embedding;

        // 4. STOCKAGE (La Mémoire)
        const { error } = await supabase.from('Memory').insert({
            profileId,
            content: `[INGESTION WEB] Source: ${url}\nCatégorie: ${category}\n\n${summary}`,
            type: 'knowledge', // On utilise un type spécifique
            source: 'web_ingest',
            embedding: vector,
            createdAt: new Date().toISOString()
        });

        if (error) throw error;

        const summaryText = typeof summary === 'string' ? summary : JSON.stringify(summary);
        return NextResponse.json({ success: true, summary: summaryText.substring(0, 100) + "..." });

    } catch (error: any) {
        console.error("❌ Erreur Ingestion:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
