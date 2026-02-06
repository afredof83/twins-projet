import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    try {
        // On cherche toutes les communications ACCEPTÉES où je suis soit l'expéditeur, soit le destinataire
        const { data, error } = await supabase
            .from('communications')
            .select('*')
            .or(`from_clone_id.eq.${profileId},to_clone_id.eq.${profileId}`)
            .eq('status', 'ACCEPTED')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ contacts: data });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
