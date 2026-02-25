import { mistralClient } from "@/lib/mistral";
﻿import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        // 1. Contrôle d'accès strict
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: "Accès refusé. Token manquant." }, { status: 401 });
        }

        const body = await req.json();
        const { url, profileId } = body;

        if (!url || !profileId) {
            return NextResponse.json({ error: "Paramètres manquants (URL ou ProfileID)" }, { status: 400 });
        }

        // 2. Initialisation du client BDD avec l'identité de l'utilisateur
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: { persistSession: false, autoRefreshToken: false },
                global: { headers: { Authorization: authHeader } }
            }
        );

        const mistral = mistralClient;

        // 3. INFILTRATION DU RÉSEAU (Scraping)
        console.log(`[SCRAPER] Infiltration de la cible : ${url}`);
        const response = await fetch(url);
        const html = await response.text();

        // Nettoyage du code avec Cheerio
        const $ = cheerio.load(html);
        $('script, style, noscript, iframe, img, svg, nav, footer').remove();
        const textContent = $('body').text().replace(/\s+/g, ' ').trim();

        if (!textContent || textContent.length < 10) {
            return NextResponse.json({ error: "La cible est vide ou protégée contre le scraping." }, { status: 400 });
        }

        // 4. DÉCOUPAGE ET VECTORISATION
        const chunks = textContent.match(/[\s\S]{1,2000}/g) || [textContent];
        let savedCount = 0;

        console.log(`[SCRAPER] ${chunks.length} fragments à vectoriser.`);

        for (const chunk of chunks) {
            const embeddingResponse = await mistral.embeddings.create({
                model: "mistral-embed",
                inputs: [chunk],
            });

            const embedding = embeddingResponse.data[0]?.embedding;
            if (!embedding) continue;

            // 5. INSERTION BDD avec UUID forcé
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
