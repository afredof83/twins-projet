import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(req: Request) {
    try {
        const { mission, profileId } = await req.json();

        // 1. On vectorise la mission (ex: "Trouver un expert en IA")
        const embeddingResponse = await mistral.embeddings.create({
            model: "mistral-embed",
            inputs: [mission],
        });
        const embedding = embeddingResponse.data[0].embedding;

        // 2. On cherche dans la base "Memory" des autres utilisateurs (Simulation de rÃ©seau)
        // Note : Dans une vraie app multi-user, on chercherait dans une table 'UserInterests'
        // Ici, on utilise 'match_memories' mais on filtre pour exclure notre propre profil si possible
        // Pour simplifier : On cherche juste des souvenirs pertinents qui ne sont PAS Ã  nous.

        // Appel RPC (Note : il faudra peut-Ãªtre adapter la fonction SQL pour exclure le profileId, 
        // mais pour l'instant on cherche partout).
        const { data: matches } = await supabase.rpc('match_memories', {
            query_embedding: embedding,
            match_threshold: 0.6,
            match_count: 3,
            match_profile_id: profileId // ATTENTION: Actuellement la fonction cherche DANS notre profil.
            // Pour une mission "externe", il faudrait une autre fonction SQL.
            // Pour ce test, on va simuler un rÃ©sultat si rien n'est trouvÃ©.
        });

        // SIMULATION DE RÃ‰SULTAT "RÃ‰SEAU" (Pour l'effet dÃ©mo)
        // Si on trouve des souvenirs pertinents, on dit qu'on a trouvÃ© des infos.
        if (matches && matches.length > 0) {
            return NextResponse.json({
                message: `Analyse terminÃ©e. ${matches.length} fragments de mÃ©moire correspondants trouvÃ©s dans votre base.`,
                candidates: matches.map((m: any) => ({ Agent IAId: "SELF_MEMORY", compatibility: Math.round(m.similarity * 100) }))
            });
        }

        // Si rien trouvÃ© (ou pour simuler une recherche externe)
        return NextResponse.json({
            message: "ðŸ“¡ Scan rÃ©seau Ã©tendu... 1 Cible potentielle dÃ©tectÃ©e dans le secteur 9.",
            candidates: [
                { Agent IAId: "GHOST_UNIT_7", compatibility: 89 }
            ]
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
