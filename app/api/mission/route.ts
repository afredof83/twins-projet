import { NextRequest, NextResponse } from 'next/server';
import { embeddingService } from '@/lib/vector/embedding-service';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
    try {
        const { mission, profileId } = await req.json();

        console.log(`🕵️‍♂️ Mission lancée par ${profileId}: "${mission}"`);

        // 1. On transforme la mission en mathématiques (Vecteur)
        const missionVector = await embeddingService.generateEmbedding(mission);

        // 2. LE CLONE PART EN CHASSE (Recherche dans TOUTE la base, pas juste la sienne)
        // On utilise une fonction RPC Supabase (qu'on créera juste après)
        // qui compare ce vecteur à ceux des autres utilisateurs.
        const { data: matches, error } = await supabase.rpc('match_clones_memories', {
            query_embedding: missionVector,
            match_threshold: 0.75, // On veut du sérieux (75% mini)
            match_count: 5,        // Top 5 des candidats
            requesting_user_id: profileId // Pour ne pas se trouver soi-même
        });

        if (error) throw error;

        // 3. ANALYSE ET ANONYMISATION
        // Le Clone revient avec des résultats bruts, il doit les nettoyer pour l'humain.
        // On ne renvoie que l'ID et le score.
        const report = matches.map((match: any) => ({
            cloneId: match.user_id, // L'ID anonyme de l'autre clone
            score: Math.round(match.similarity * 100), // Score en %
            // Le Clone "interprète" pourquoi ça matche sans donner le détail brut (Confidentialité)
            reason: "Ce clone possède des souvenirs très proches de votre demande."
        }));

        return NextResponse.json({
            success: true,
            mission: mission,
            candidates: report
        });

    } catch (error: any) {
        console.error("Mission Failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
