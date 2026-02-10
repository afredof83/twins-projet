import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMistralEmbedding } from '@/lib/mistral';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const { profileId } = await request.json();
        const report = { cleaned: 0, embedded: 0 };

        if (!profileId) {
            return NextResponse.json({ error: "ProfileId is required." }, { status: 400 });
        }

        // --- MISSION 1 : NETTOYAGE DES DOUBLONS (RAPIDE) ---
        // On appelle la fonction RPC SQL qu'on a créée plus tôt
        const { data: cleanedCount, error: rpcError } = await supabase
            .rpc('cleanup_duplicates', { target_profile_id: profileId });

        if (rpcError) {
            console.error("Erreur RPC cleanup_duplicates:", rpcError);
        } else if (typeof cleanedCount === 'number') {
            report.cleaned = cleanedCount;
        }

        // --- MISSION 2 : VECTORISATION DES OUBLIÉS (BATCH PETIT) ---
        // On cherche seulement 5 souvenirs sans vecteurs (pour ne pas ralentir le serveur)
        const { data: memories, error: fetchError } = await supabase
            .from('Memory')
            .select('id, content')
            .eq('profileId', profileId)
            .is('embedding', null)
            .limit(5);

        if (fetchError) {
            console.error("Erreur récupération souvenirs sans vecteurs:", fetchError);
        }

        if (memories && memories.length > 0) {
            for (const memory of memories) {
                if (memory.content) {
                    const embedding = await getMistralEmbedding(memory.content);
                    if (embedding) {
                        const { error: updateError } = await supabase
                            .from('Memory')
                            .update({ embedding })
                            .eq('id', memory.id);

                        if (!updateError) {
                            report.embedded++;
                        } else {
                            console.error(`Erreur update vector pour memory ${memory.id}:`, updateError);
                        }
                    }
                }
            }
        }

        // On renvoie un succès discret
        return NextResponse.json({ success: true, report });

    } catch (error: any) {
        // En mode silencieux, on log juste l'erreur côté serveur
        console.error("❌ Échec Maintenance Autonome:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
