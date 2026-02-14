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

    // Lecture "Large" : On cherche dans les deux colonnes pour être sûr de tout trouver
    const { data, error } = await supabase
        .from('Memory')
        .select('*')
        // SÉCURITÉ : On cherche dans profileId (Texte) OU profile_id (UUID)
        // Mais on doit faire attention que le paramètre soit compatible
        .or(`profileId.eq.${pid},profile_id.eq.${pid}`)
        .order('createdAt', { ascending: false });

    if (error) {
        console.error("❌ Erreur lecture:", error);
        // Si l'erreur est liée au type UUID (ex: on cherche un non-UUID dans une colonne UUID),
        // on peut tenter un fallback, mais ici on logue déjà l'erreur.
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
        const memoryData: any = {
            content,
            profileId: profileId, // On remplit TOUJOURS la colonne texte (filet de sécurité)
            type: type || 'THOUGHT',
            createdAt: new Date().toISOString(), // CamelCase
            created_at: new Date().toISOString() // SnakeCase (Doublon sécu)
        };

        // INTELLIGENCE ICI : On ne remplit la colonne UUID (profile_id) que si c'est un VRAI UUID
        // Sinon, on laisse NULL pour éviter le crash "Invalid input syntax for type uuid" de Postgres
        if (profileId && isUUID(profileId)) {
            memoryData.profile_id = profileId;
        } else {
            console.warn(`⚠️ ID non-UUID détecté (${profileId}), colonne profile_id ignorée.`);
        }

        const { data, error } = await supabase
            .from('Memory')
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