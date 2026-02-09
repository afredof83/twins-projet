import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(request: Request) {
    try {
        const { subscription, profileId } = await request.json();

        // Sauvegarde l'objet subscription dans le profil
        // Note: Assurez-vous que la colonne "subscription" type jsonb existe dans la table "Profile"
        const { error } = await supabase
            .from('Profile')
            .update({ subscription })
            .eq('id', profileId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
