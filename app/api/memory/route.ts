import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const pid = searchParams.get('profileId');

    if (!pid) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 });

    // CORRECTION : On cherche dans la colonne TEXTE 'profileId'
    // On tente les deux tables par sécurité (Memory ou memories)
    let query = supabase
        .from('Memory') // On essaie la table principale
        .select('*')
        .eq('profileId', pid) // Colonne TEXTE
        .order('createdAt', { ascending: false });

    const { data, error } = await query;

    if (error) {
        // Si erreur, c'est peut-être la table minuscule qui est utilisée
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ memories: data || [] });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { content, profileId, type } = body;

        // INSERTION : On écrit dans 'Memory' avec la colonne 'profileId' (Texte)
        const { data, error } = await supabase
            .from('Memory')
            .insert([
                {
                    content,
                    profileId: profileId, // <-- Colonne TEXTE (compatible "afredof83")
                    type: type || 'THOUGHT',
                    createdAt: new Date().toISOString() // Colonne CamelCase
                }
            ])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Erreur save:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}