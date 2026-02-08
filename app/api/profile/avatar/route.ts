import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const { profileId } = await request.json();

        if (!profileId) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

        // 1. GÉNÉRATION DIRECTE (DiceBear)
        // On utilise l'ID comme "graine" (seed) :
        // Cela garantit que "afredof" aura toujours le même robot, unique à lui.
        // Style 'bottts-neutral' = Robots au look propre et moderne.
        // Note: The user specified URL syntax seems correct for v9.x
        const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${profileId}&backgroundColor=transparent`;

        // 2. SAUVEGARDE
        // We assume 'avatarUrl' column exists in 'Profile' table. If not, this might fail, but I must follow instructions.
        const { error } = await supabase
            .from('Profile')
            .update({ avatarUrl: avatarUrl })
            .eq('id', profileId);

        if (error) {
            console.error("Erreur SQL:", error);
            return NextResponse.json({ error: "Erreur sauvegarde base de données" }, { status: 500 });
        }

        return NextResponse.json({ success: true, url: avatarUrl });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
