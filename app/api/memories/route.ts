import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// On utilise la clé SERVICE pour contourner les permissions si besoin (BYPASS RLS)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Fonction utilitaire pour vérifier si c'est un UUID valide
function isUUID(str: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(str);
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const pid = searchParams.get('profileId');

    if (!pid) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 });

    console.log(`🔍 Lecture Memory pour ${pid}`);

    // Lecture : On utilise les noms de colonnes de la BDD (snake_case)
    const { data, error } = await supabase
        .from('memory')
        .select('*')
        .eq('profile_id', pid)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("❌ Erreur lecture:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ memories: data || [] });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { content, profileId, type } = body;

        console.log(`📝 Tentative sauvegarde pour ID: ${profileId}`);

        // Préparation de l'objet à insérer
        // On mappe les champs vers les colonnes BDD (snake_case)
        const memoryData = {
            content,
            profile_id: profileId,
            type: type || 'THOUGHT',
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('memory')
            .insert([memoryData])
            .select()
            .single();

        if (error) {
            console.error("🔥 Erreur écriture DB:", error);
            throw error;
        }

        console.log("✅ Sauvegarde réussie, ID:", data?.id);
        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}