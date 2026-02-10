import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get('profileId');

    // Récupère les vrais profils sauf soi-même
    const { data: profiles } = await supabase
        .from('Profile')
        .select('id, name')
        .neq('id', profileId)
        .limit(10);

    let contacts = profiles?.map(p => ({
        id: p.id,
        name: p.name || "Inconnu",
        lastMessage: "Signal détecté..."
    })) || [];

    // Ajout factice si vide pour l'effet visuel
    if (contacts.length === 0) {
        contacts.push({ id: 'ghost', name: 'GHOST_SIGNAL', lastMessage: 'En attente de connexion...' });
    }

    return NextResponse.json({ contacts });
}