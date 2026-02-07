
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialisation Supabase (Server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
        return NextResponse.json({ error: 'Profile ID missing' }, { status: 400 });
    }

    try {
        // Récupération des souvenirs pour ce profil
        // On trie par date de création décroissante (du plus récent au plus vieux)
        const { data: memories, error } = await supabase
            .from('Memory') // Attention à la majuscule si votre table s'appelle "Memory"
            .select('id, type, createdAt, encryptedContent')
            .eq('profileId', profileId)
            .order('createdAt', { ascending: false });

        if (error) {
            console.error('Supabase Error:', error);
            throw error;
        }

        return NextResponse.json({
            memories: memories || [],
            count: memories?.length || 0
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
