import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { createClient } from '@/lib/supabaseServer';

// Sources par défaut si l'utilisateur n'en a pas
const DEFAULT_FEEDS = [
    { id: 'lemonde', name: 'Le Monde', url: 'https://www.lemonde.fr/rss/une.xml' }
];

export async function GET() {
    try {
        const supabase = await createClient();

        let sources = DEFAULT_FEEDS;

        // Tentative de récupération de l'utilisateur et de ses sources
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { data: userSources } = await supabase
                .from('RadarSource')
                .select('*')
                .eq('profileId', user.id);

            if (userSources && userSources.length > 0) {
                // @ts-ignore
                sources = userSources;
            }
        }

        console.log(`📡 Radar : Récupération RSS (${sources.length} sources)...`);
        const parser = new Parser();

        // On lance toutes les requêtes en parallèle 
        const feedPromises = sources.map(async (source) => {
            try {
                const feedData = await parser.parseURL(source.url);
                return feedData.items.slice(0, 3).map(item => ({
                    source: source.name || 'Inconnu',
                    title: item.title,
                    link: item.link,
                    date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
                }));
            } catch (e) {
                console.error(`Erreur flux ${source.name || source.url}:`, e);
                return [];
            }
        });

        const results = await Promise.all(feedPromises);

        // On aplatit tout en une seule liste et on trie par date
        const allNews = results.flat().sort((a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return NextResponse.json({ news: allNews.slice(0, 20) }); // Top 20 infos

    } catch (error: any) {
        console.error("❌ Erreur Radar:", error.message);
        return NextResponse.json({ error: "Radar indisponible" }, { status: 503 });
    }
}
