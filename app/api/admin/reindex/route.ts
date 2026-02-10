import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMistralEmbedding } from '@/lib/mistral';

// Initialisation Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const { profileId } = await request.json();

        if (!profileId) {
            return NextResponse.json({ error: "ProfileId is required." }, { status: 400 });
        }

        // 1. Récupérer les souvenirs qui n'ont PAS encore de vecteur (embedding est null)
        // Nous sélectionnons ceux où le champ embedding est null.
        // Note: Supabase JS filter .is('embedding', null) should work.

        // Pour éviter les problèmes si 'embedding' n'est pas sélectionné, on le demande pas explicitement mais on filtre dessus.
        // On sélectionne id et content.
        const { data: memories, error } = await supabase
            .from('Memory')
            .select('id, content')
            .eq('profileId', profileId)
            .is('embedding', null)
            .limit(50); // On fait par lot de 50 pour ne pas surcharger Mistral

        if (error) {
            console.error("Erreur Supabase lors de la récupération des souvenirs:", error);
            throw error;
        }

        if (!memories || memories.length === 0) {
            return NextResponse.json({ message: "Aucun souvenir à indexer.", processed: 0 });
        }

        let processedCount = 0;

        // 2. Boucle de traitement
        for (const memory of memories) {
            if (memory.content) {
                // On demande à Mistral : "Transforme ce texte en maths"
                const embedding = await getMistralEmbedding(memory.content);

                if (embedding) {
                    // On sauvegarde le résultat
                    const { error: updateError } = await supabase
                        .from('Memory')
                        .update({ embedding })
                        .eq('id', memory.id);

                    if (updateError) {
                        console.error(`Erreur lors de la mise à jour du souvenir ${memory.id}:`, updateError);
                    } else {
                        processedCount++;
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `${processedCount} souvenirs vectorisés.`,
            processed: processedCount,
            remaining: memories.length - processedCount
        });

    } catch (error: any) {
        console.error("Erreur globale dans reindex:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
