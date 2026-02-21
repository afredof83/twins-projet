import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        // 1. ContrÃ´le d'accÃ¨s strict
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: "AccÃ¨s refusÃ©. Token manquant." }, { status: 401 });
        }

        const body = await req.json();
        const { url, profileId } = body;

        if (!url || !profileId) {
            return NextResponse.json({ error: "ParamÃ¨tres manquants (URL ou ProfileID)" }, { status: 400 });
        }

        // 2. Initialisation du client BDD avec l'identitÃ© de l'utilisateur
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: { persistSession: false, autoRefreshToken: false },
                global: { headers: { Authorization: authHeader } }
            }
        );

        const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

        // 3. INFILTRATION DU RÃ‰SEAU (Scraping)
        console.log(`[SCRAPER] Infiltration de la cible : ${url}`);
        const response = await fetch(url);
        const html = await response.text();

        // Nettoyage du code avec Cheerio
        const $ = cheerio.load(html);
        $('script, style, noscript, iframe, img, svg, nav, footer').remove();
        const textContent = $('body').text().replace(/\s+/g, ' ').trim();

        if (!textContent || textContent.length < 10) {
            return NextResponse.json({ error: "La cible est vide ou protÃ©gÃ©e contre le scraping." }, { status: 400 });
        }

        // 4. DÃ‰COUPAGE ET VECTORISATION
        const chunks = textContent.match(/[\s\S]{1,2000}/g) || [textContent];
        let savedCount = 0;

        console.log(`[SCRAPER] ${chunks.length} fragments Ã  vectoriser.`);

        for (const chunk of chunks) {
            const embeddingResponse = await mistral.embeddings.create({
                model: "mistral-embed",
                inputs: [chunk],
            });

            const embedding = embeddingResponse.data[0]?.embedding;
            if (!embedding) continue;

            // 5. INSERTION BDD avec UUID forcÃ©
            const { error } = await supabase.from('memory').insert({
                id: crypto.randomUUID(),
                profile_id: profileId,
                content: `[WEB: ${url}] ${chunk}`,
                type: 'link',
                source: url,
                embedding: embedding,
                created_at: new Date().toISOString()
            });

            if (!error) savedCount++;
            else console.error("[ERREUR BDD SCRAPE]", error);
        }

        return NextResponse.json({ success: true, fragments: savedCount });

    } catch (error: any) {
        console.error("[CRITIQUE SCRAPER]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
