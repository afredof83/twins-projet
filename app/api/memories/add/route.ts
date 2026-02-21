import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// Filtres de pertinence
const NOISE_KEYWORDS = ["publicitÃ©", "promo", "sponsored", "cookies", "abonnez-vous"];

async function shouldMemorize(content: string): Promise<boolean> {
    // 1. Longueur min
    if (content.length < 50) return false;

    // 2. Mots-clÃ©s bruit
    if (NOISE_KEYWORDS.some(word => content.toLowerCase().includes(word))) return false;

    return true;
}

// Retry logic avec backoff exponentiel
async function fetchWithRetry(fn: () => Promise<any>, retries = 3, delay = 1000): Promise<any> {
    try {
        return await fn();
    } catch (error: any) {
        if (error?.status === 429 && retries > 0) {
            console.log(`â³ Rate limit atteint. Nouvelle tentative dans ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
}

export async function POST(req: Request) {
    try {
        const { content, type, profileId } = await req.json();

        // 1. Filtrage (Le Gardien)
        if (!await shouldMemorize(content)) {
            return NextResponse.json({ skipped: true, reason: "Contenu non pertinent ou trop court." });
        }

        let contentToEmbed = content;
        let finalContent = content;

        // 2. RÃ©sumÃ© intelligent (si trop long)
        if (content.length > 1500) {
            console.log("ðŸ“ Contenu long dÃ©tectÃ© -> RÃ©sumÃ© en cours...");
            try {
                const summaryResponse = await fetchWithRetry(() => mistral.chat.complete({
                    model: "mistral-small-latest",
                    messages: [
                        { role: "system", content: "Tu es un archiviste expert. RÃ©sume ce texte en un paragraphe dense et factuel de 150 mots maximum. Capture les entitÃ©s nommÃ©es et les idÃ©es clÃ©s." },
                        { role: "user", content: content }
                    ]
                }));
                const summary = summaryResponse.choices?.[0]?.message?.content || content.substring(0, 500); // Fallback
                contentToEmbed = `[RÃ‰SUMÃ‰] ${summary}`;
                // Optionnel : On peut stocker le rÃ©sumÃ© ou garder le texte complet. 
                // Ici on garde le texte complet dans 'content' mais on vectorise le rÃ©sumÃ©.
            } catch (e) {
                console.error("Erreur rÃ©sumÃ©:", e);
                // On continue avec le texte complet si le rÃ©sumÃ© Ã©choue
            }
        }

        // 3. Vectorisation (avec Retry)
        const embeddingResponse = await fetchWithRetry(() => mistral.embeddings.create({
            model: "mistral-embed",
            inputs: [contentToEmbed],
        }));

        const embedding = embeddingResponse.data[0].embedding;

        // 4. Expiration (Nettoyage automatique)
        let expiresAt = null;
        if (type === 'news') {
            const date = new Date();
            date.setDate(date.getDate() + 7); // Expire dans 7 jours
            expiresAt = date.toISOString();
        }

        // 5. Stockage Supabase (StandardisÃ© snake_case)
        const { error } = await supabase
            .from('memory') // â¬…ï¸ Minuscule
            .insert({
                profile_id: profileId, // â¬…ï¸ snake_case
                content: finalContent,
                type: type || 'thought',
                embedding: embedding,
                source: 'manual_input',
                expires_at: expiresAt // â¬…ï¸ snake_case (dÃ©jÃ  correct si la DB a la colonne)
            });

        if (error) throw error;

        return NextResponse.json({ success: true, summarized: contentToEmbed !== content });

    } catch (error: any) {
        console.error("Erreur Scribe:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
