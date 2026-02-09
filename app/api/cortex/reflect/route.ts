import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Configuration WebPush
webPush.setVapidDetails(
    `mailto:${process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

async function scrapeUrl(rawUrl: string) {
    try {
        const encodedUrl = encodeURI(decodeURI(rawUrl));
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' };
        const response = await fetch(encodedUrl, { headers });
        if (!response.ok) return null;
        const html = await response.text();
        let text = html
            .replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, " ")
            .replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, " ")
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        return text.substring(0, 3000);
    } catch (e) { return null; }
}

export async function POST(request: Request) {
    try {
        const { profileId } = await request.json();

        if (!profileId) {
            return NextResponse.json({ error: "Profile ID manquant" }, { status: 400 });
        }

        // 1. ANALYSE DU CORTEX ACTUEL
        const { data: memories } = await supabase
            .from('Memory')
            .select('content, type')
            .eq('profileId', profileId)
            .order('createdAt', { ascending: false })
            .limit(15);

        const context = memories?.map(m => `[${m.type}] ${m.content}`).join('\n') || "Cortex vide.";

        // 2. IA : DÉCISION D'APPRENTISSAGE
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: "mistral-small-latest",
                messages: [
                    { role: "system", content: "Tu es le libre arbitre d'un clone. Analyse tes souvenirs et décide si tu as besoin d'infos web pour compléter tes connaissances. Si oui, indique l'URL. Réponds STRICTEMENT en JSON : { \"thought\": \"Ta réflexion...\", \"urlToScrape\": \"URL ou null\" }" },
                    { role: "user", content: `Contexte mémoriel :\n${context}` }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`Erreur Mistral API: ${response.status}`);
        }

        const data = await response.json();
        let parsedContent;
        try {
            parsedContent = JSON.parse(data.choices[0].message.content);
        } catch (e) {
            // Fallback
            parsedContent = { thought: data.choices[0].message.content, urlToScrape: null };
        }

        const { thought, urlToScrape } = parsedContent;

        // 3. AUTO-SCRAPING SI NÉCESSAIRE
        let scrapedData = "";
        if (urlToScrape && typeof urlToScrape === 'string' && urlToScrape.startsWith('http')) {
            console.log(`[REFLECT] Auto-scraping de ${urlToScrape}...`);
            const result = await scrapeUrl(urlToScrape);
            if (result && result.length > 50) {
                scrapedData = `\n\n[AUTO-ACQUISITION : ${urlToScrape}]\n${result}`;
            }
        }

        // 4. INJECTION DANS LA MÉMOIRE
        await supabase.from('Memory').insert([{
            profileId,
            content: `[LIBRE ARBITRE] ${thought}${scrapedData}`,
            type: 'thought',
            source: 'autonomous_curiosity'
        }]);

        // 5. NOTIFICATION PUSH (NOUVEAU)
        const { data: profile } = await supabase.from('Profile').select('subscription').eq('id', profileId).single();

        if (profile?.subscription) {
            try {
                const payload = JSON.stringify({
                    title: 'TWINS : Nouvelle Réflexion',
                    body: thought.substring(0, 100) + '...'
                });

                await webPush.sendNotification(profile.subscription, payload);
                console.log("📡 Notification Push envoyée.");
            } catch (error) {
                console.error("Erreur Push:", error);
            }
        }

        return NextResponse.json({ success: true, thought, urlToScrape: urlToScrape || null });

    } catch (error: any) {
        console.error("[REFLECT ERROR]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
