import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { getMistralEmbedding } from '@/lib/mistral';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const { url, profileId } = await request.json();

        if (!url) return NextResponse.json({ error: "URL manquante" }, { status: 400 });

        console.log(`[SCRAPER] Cible : ${url}`);

        // 1. Récupération du HTML
        const res = await fetch(url);
        if (!res.ok) throw new Error("Impossible d'accéder à la page.");
        const html = await res.text();

        // 2. Nettoyage avec Cheerio
        const $ = cheerio.load(html);

        // On supprime les éléments inutiles (scripts, styles, pubs, nav)
        $('script, style, nav, footer, iframe, svg, button').remove();

        // On récupère le titre et le texte principal
        const title = $('title').text() || 'Article Web';
        // On cherche le contenu dans 'article', 'main', ou 'body' par défaut
        let content = $('article').text() || $('main').text() || $('body').text();

        // Nettoyage des espaces blancs multiples
        content = content.replace(/\s+/g, ' ').trim().substring(0, 25000);

        if (content.length < 100) throw new Error("Contenu trop court ou illisible.");

        // 3. Analyse Mistral
        const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: "mistral-small",
                messages: [
                    { role: "system", content: "Tu es un analyste. Résume cet article en Markdown (Titre, Résumé, Points clés). Sois technique et précis." },
                    { role: "user", content: `Titre: ${title}\n\nContenu: ${content}` }
                ]
            })
        });

        const mistralData = await mistralResponse.json();
        const summary = mistralData.choices?.[0]?.message?.content || "Analyse impossible.";

        // 4. Vectorisation & Sauvegarde
        const embedding = await getMistralEmbedding(summary);

        await supabase.from('Memory').insert([{
            profileId,
            content: `[WEB] ${title}\nSource: ${url}\n\n${summary}`,
            type: 'knowledge',
            source: 'web_scraper',
            embedding: embedding
        }]);

        return NextResponse.json({ success: true, title, summary });

    } catch (error: any) {
        console.error("❌ Erreur Scraper:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
