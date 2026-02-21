import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';
import * as cheerio from 'cheerio';

// Initialisation
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(req: Request) {
    try {
        const { url, profileId, category } = await req.json();

        console.log(`ðŸ§  [CORTEX] Ingestion lancÃ©e pour : ${url}`);

        // Ajout d'une vÃ©rification basique de l'URL
        if (!url) throw new Error("URL manquante");

        // 1. SCRAPING (L'Å“il)
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CortexBot/1.0)' } });
        if (!response.ok) throw new Error(`Site inaccessible: ${response.status}`);
        const html = await response.text();
        const $ = cheerio.load(html);

        // Nettoyage violent
        $('script, style, nav, footer, iframe, noscript, header').remove();
        let cleanText = $('body').text().replace(/\s+/g, ' ').trim();

        // On garde les 6000 premiers caractÃ¨res pour le rÃ©sumÃ©
        const textToProcess = cleanText.substring(0, 6000);

        // 2. SYNTHÃˆSE (L'Esprit) - On demande Ã  Mistral de structurer la data
        const summaryResponse = await mistral.chat.complete({
            model: "mistral-large-latest",
            messages: [{
                role: "user",
                content: `Analyse ce contenu web et extrais les points stratÃ©giques clÃ©s pour FrÃ©dÃ©ric Rey (Projet Twins/FisherMade).
        Contenu : ${textToProcess}
        
        Format attendu : RÃ©sumÃ© dense des faits, chiffres clÃ©s, noms de produits, technologies.`
            }]
        });

        const summary = summaryResponse.choices?.[0].message.content || cleanText;

        // 3. VECTORISATION (L'Ancrage)
        const embeddingResponse = await mistral.embeddings.create({
            model: "mistral-embed",
            inputs: [`[SOURCE: ${url}] ${summary}`],
        });
        const vector = embeddingResponse.data[0].embedding;

        // 4. STOCKAGE (La MÃ©moire)
        const { error } = await supabase.from('Memory').insert({
            profileId,
            content: `[INGESTION WEB] Source: ${url}\nCatÃ©gorie: ${category}\n\n${summary}`,
            type: 'knowledge', // On utilise un type spÃ©cifique
            source: 'web_ingest',
            embedding: vector,
            createdAt: new Date().toISOString()
        });

        if (error) throw error;

        const summaryText = typeof summary === 'string' ? summary : JSON.stringify(summary);
        return NextResponse.json({ success: true, summary: summaryText.substring(0, 100) + "..." });

    } catch (error: any) {
        console.error("âŒ Erreur Ingestion:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
