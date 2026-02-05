import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// On se connecte directement (Bypass Prisma pour éviter les conflits de schéma)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const profileId = searchParams.get('profileId');

        if (!profileId) {
            return NextResponse.json({ error: 'ProfileId required' }, { status: 400 });
        }

        // Lecture directe de la table "memories"
        const { data, error } = await supabase
            .from('memories')
            .select('*')
            .eq('profileId', profileId)
            .order('createdAt', { ascending: false }) // Les plus récents en premier
            .limit(50);

        if (error) {
            console.error("Supabase Read Error:", error);
            throw new Error(error.message);
        }

        return NextResponse.json(data || []);

    } catch (error: any) {
        console.error('API Memories Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch memories' },
            { status: 500 }
        );
    }
}