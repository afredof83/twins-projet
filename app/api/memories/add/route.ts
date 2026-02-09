import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMistralEmbedding } from '@/lib/mistral';

// 1. INIT SUPABASE
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 2. FONCTION SCRAPING
async function scrapeUrl(rawUrl: string) {
    try {
        const encodedUrl = encodeURI(decodeURI(rawUrl));
        console.log(`[SCRAPER] Cible : ${encodedUrl}`);

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        };

        const response = await fetch(encodedUrl, { headers, next: { revalidate: 0 } });
        if (!response.ok) return null;

        const html = await response.text();

        // Nettoyage Regex
        let text = html
            .replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, " ")
            .replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, " ")
            .replace(/<!--[\s\S]*?-->/g, "") // Enlève les commentaires HTML
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        return text.substring(0, 4000);
    } catch (error) {
        console.error("[SCRAPER ERROR]", error);
        return null;
    }
}

// 3. API POST
export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { content, type, profileId, source } = body;

        if (!content || !profileId) {
            return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
        }

        // A. Scraping si URL
        if (typeof content === 'string' && content.trim().startsWith('http')) {
            console.log("🔍 Analyse URL...");
            const scrapedText = await scrapeUrl(content.trim());

            if (scrapedText && scrapedText.length > 50) {
                // On garde l'URL mais on ajoute le contenu scrapé
                const url = content;
                content = `[SOURCE WEB: ${url}]\n\nCONTENU :\n${scrapedText}`;
                type = 'document'; // Force le type document
            } else {
                // Si ça échoue, on garde juste l'URL
                content = `Lien web : ${content}`;
            }
        }

        // B. VECTORISATION (NOUVEAU)
        console.log("🧠 Génération du vecteur...");
        const embedding = await getMistralEmbedding(content);

        // C. Insertion Supabase
        const { data, error } = await supabase
            .from('Memory')
            .insert([{
                profileId,
                content,
                type: type || 'thought',
                source: source || 'manual',
                embedding: embedding // Vecteur injecté
            }])
            .select();

        if (error) {
            console.error("❌ ERREUR SUPABASE:", error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (e: any) {
        console.error("❌ CRASH:", e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
