import { NextResponse } from 'next/server';
import Parser from 'rss-parser'; // Assurez-vous d'avoir fait: npm install rss-parser
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const parser = new Parser();

export async function POST(req: Request) {
    try {
        const { feedUrl, profileId } = await req.json();

        if (!feedUrl) return NextResponse.json({ error: "URL manquante" }, { status: 400 });

        const feed = await parser.parseURL(feedUrl);

        let count = 0;
        // On prend les 5 derniers articles
        for (const item of feed.items.slice(0, 5)) {
            if (item.content || item.summary || item.title) {
                const content = `${item.title}: ${item.contentSnippet || item.summary || ""}`;

                await supabase.from('Memory').insert({
                    profileId,
                    content: content,
                    type: 'rss_feed',
                    source: feed.title || feedUrl
                });
                count++;
            }
        }

        return NextResponse.json({ success: true, count });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
