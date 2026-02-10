import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

// Liste des sources de surveillance
const FEEDS = [
    { id: 'wired', url: 'https://www.wired.com/feed/rss' },
    { id: 'verge', url: 'https://www.theverge.com/rss/index.xml' },
    { id: 'hackernews', url: 'https://hnrss.org/newest?points=100' }, // Uniquement les posts populaires
    { id: 'cointelegraph', url: 'https://cointelegraph.com/rss' }
];

export async function GET() {
    try {
        const parser = new Parser();

        // On lance toutes les requêtes en parallèle pour la vitesse
        const feedPromises = FEEDS.map(async (feed) => {
            try {
                const feedData = await parser.parseURL(feed.url);
                return feedData.items.slice(0, 3).map(item => ({
                    source: feed.id,
                    title: item.title,
                    link: item.link,
                    date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
                }));
            } catch (e) {
                console.error(`Erreur flux ${feed.id}:`, e);
                return [];
            }
        });

        const results = await Promise.all(feedPromises);

        // On aplatit tout en une seule liste et on trie par date (le plus récent en premier)
        const allNews = results.flat().sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return NextResponse.json({ news: allNews.slice(0, 15) }); // Top 15 infos

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
