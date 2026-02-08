import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const profileId = searchParams.get('profileId');

        if (!profileId) {
            return NextResponse.json({ memories: [] });
        }

        console.log(`[LECTURE] Récupération souvenirs pour : ${profileId}`);

        // On récupère TOUT sans filtre pour être sûr de voir les données
        const { data, error } = await supabase
            .from('Memory')
            .select('*')
            .eq('profileId', profileId)
            .order('createdAt', { ascending: false }) // Les plus récents en premier
            .limit(50);

        if (error) {
            console.error("🔥 Erreur Lecture Supabase:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`[LECTURE] ${data?.length || 0} souvenirs trouvés.`);

        return NextResponse.json({ memories: data || [] });

    } catch (e: any) {
        console.error("🔥 Crash API Lecture:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
