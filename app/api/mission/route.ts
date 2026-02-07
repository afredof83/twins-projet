import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

export async function POST(request: Request) {
    try {
        const { mission, profileId } = await request.json();

        if (!mission || !profileId) {
            return NextResponse.json({ error: 'Mission or ID missing' }, { status: 400 });
        }

        // 1. Vectoriser la mission (Comprendre ce qu'on cherche)
        if (!MISTRAL_API_KEY) return NextResponse.json({ candidates: [] });

        const embeddingResponse = await fetch('https://api.mistral.ai/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: 'mistral-embed',
                input: [mission]
            })
        });

        const embeddingData = await embeddingResponse.json();
        const queryVector = embeddingData.data[0].embedding;

        // 2. Chercher dans TOUTE la base (sauf soi-même)
        const { data: matches, error } = await supabase
            .rpc('match_global_memories', {
                query_embedding: queryVector,
                searcher_profile_id: profileId, // On s'exclut de la recherche
                match_threshold: 0.6,
                match_count: 5
            });

        if (error) {
            console.error("Erreur SQL Mission:", error);
            throw error;
        }

        // 3. Organiser les résultats par clone
        // On regroupe les souvenirs trouvés par profil
        const candidatesMap = new Map();

        matches.forEach((match: any) => {
            if (!candidatesMap.has(match.profile_id)) {
                candidatesMap.set(match.profile_id, {
                    cloneId: match.profile_id,
                    score: Math.round(match.similarity * 100),
                    reason: `A évoqué : "${match.content}"`
                });
            }
        });

        const candidates = Array.from(candidatesMap.values());

        return NextResponse.json({ candidates });

    } catch (error) {
        console.error("Erreur Mission:", error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}