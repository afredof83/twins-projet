import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const { profileId, password } = await request.json();

        if (!profileId || !password) {
            return NextResponse.json({ error: 'Identifiants manquants' }, { status: 400 });
        }

        // 1. On récupère le vrai mot de passe (hash) stocké
        const { data: profile, error } = await supabase
            .from('Profile')
            .select('passwordHash')  // In a real app, this might be 'password_hash' or similar, keeping user's instruction 'passwordHash' for now but worth checking schema if failed.
            .eq('id', profileId)
            .single();

        if (error || !profile) {
            return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
        }

        // 2. VERIFICATION SIMPLE
        // (Dans une version future, on utilisera bcrypt.compare ici)
        if (profile.passwordHash !== password) {
            return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
        }

        // 3. Succès
        return NextResponse.json({ success: true });

    } catch (e) {
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
