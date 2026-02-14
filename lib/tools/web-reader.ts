import * as cheerio from 'cheerio';

export async function readUrlContent(url: string): Promise<string | null> {
    try {
        console.log(`🌐 [ORACLE] Tentative de lecture : ${url}`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) return null;

        const html = await response.text();
        const $ = cheerio.load(html);

        // Nettoyage : on vire les pubs, scripts et styles
        $('script, style, nav, footer, iframe, noscript').remove();

        // On récupère le texte pur
        let content = $('body').text().replace(/\s+/g, ' ').trim();

        // On limite à 6000 caractères pour ne pas saturer Mistral
        return content.substring(0, 6000);
    } catch (error) {
        console.error("❌ Erreur Web Reader:", error);
        return null;
    }
}
