export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';
import { prisma } from '@/lib/prisma';
import { createClientServer } from '@/lib/supabaseScoped';

// 1. Initialisation de l'Agent Ipse (Mistral AI)
const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY || '',
});

/**
 * API Radar - Matchmaking Sémantique
 * Gère la recherche par phrase ou la recommandation basée sur le profil.
 */
export async function POST(req: Request) {
    try {
        // 2. Authentification & Client Scoped
        const { user, supabase } = await createClientServer(req);

        // 3. Récupération des paramètres (Query / Filtres)
        const body = await req.json();
        const {
            query,
            minTjm = 0,
            maxTjm = 1000000,
            role = null,
            matchCount = 10,
            threshold = 0.3,
            prismType = 'WORK' // WORK, SOCIAL, HOBBY
        } = body;

        let targetEmbedding: number[] | null = null;

        // 4. Stratégie Sémantique
        if (query && query.trim().length > 3) {
            // Cas A : Recherche textuelle active
            const embeddingResponse = await mistral.embeddings.create({
                model: 'mistral-embed',
                inputs: [query],
            });
            targetEmbedding = embeddingResponse.data[0].embedding ?? null;
        } else {
            // Cas B : Recommandation passive (basée sur le profil utilisateur)
            // On sélectionne la colonne correspondante au type de prisme
            let embeddingColumn = "bioEmbedding";
            if (prismType === 'SOCIAL') embeddingColumn = "social_embedding";
            if (prismType === 'HOBBY') embeddingColumn = "hobby_embedding";

            const [currentUser]: any = await prisma.$queryRawUnsafe(`
                SELECT "${embeddingColumn}"::text as embedding FROM "Profile" WHERE id = $1 LIMIT 1
            `, user.id);

            if (!currentUser || !currentUser.embedding) {
                return NextResponse.json({
                    error: `Profil ${prismType} incomplet. Veuillez configurer ce prisme pour activer le radar passif.`
                }, { status: 400 });
            }

            targetEmbedding = JSON.parse(currentUser.embedding);
        }

        if (!targetEmbedding) {
            return NextResponse.json({ error: 'Failed to generate search vector' }, { status: 500 });
        }

        // 5. Appel au moteur SQL Radar (RPC match_profiles_v2 ou générique)
        // On passe le vecteur et le type de prisme pour que le SQL cherche le bon match
        const { data: matches, error: rpcError } = await supabase.rpc('match_profiles', {
            query_embedding: targetEmbedding,
            match_threshold: threshold,
            match_count: matchCount,
            min_tjm: minTjm,
            max_tjm: maxTjm,
            target_role: role,
            prism_type: prismType // On suppose que match_profiles est mis à jour pour filtrer par prisme
        });

        if (rpcError) {
            console.error('[RADAR_RPC_ERROR]', rpcError);
            return NextResponse.json({ error: 'Le moteur Radar a rencontré une erreur technique.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            query: query || 'Recommendation basée sur votre profil',
            results: matches || []
        });

    } catch (error: any) {
        console.error('[RADAR_API_ERROR]', error);
        return NextResponse.json({ error: 'Synchronisation avec Ipse interrompue.' }, { status: 500 });
    }
}
