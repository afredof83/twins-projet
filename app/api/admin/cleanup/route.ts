import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

        // Appel de la fonction RPC (Remote Procedure Call)
        // Cette fonction SQL 'cleanup_duplicates' doit exister dans Supabase.
        // Elle prend un paramètre 'target_profile_id'.
        // Elle retourne le nombre de doublons supprimés (integer).
        const { data, error } = await supabase
            .rpc('cleanup_duplicates', { target_profile_id: profileId });

        if (error) {
            console.error("Erreur RPC cleanup_duplicates:", error);
            throw error;
        }

        // Si data est null, on assume 0 (ou peut-être une erreur silencieuse, mais l'erreur est gérée au-dessus)
        const deletedCount = data === null ? 0 : data;

        return NextResponse.json({
            success: true,
            message: `Nettoyage terminé. ${deletedCount} doublons supprimés.`
        });

    } catch (error: any) {
        console.error("Erreur Cleanup API:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
