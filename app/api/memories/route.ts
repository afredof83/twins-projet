import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

        // Récupération des souvenirs (triés par date)
        const { data, error } = await supabase
            .from('Memory')
            .select('*')
            .eq('profileId', profileId)
            .order('createdAt', { ascending: false })
            .limit(100);

        if (error) {
            console.error("Erreur lecture mémoires:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ memories: data || [] });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}