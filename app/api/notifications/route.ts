import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
        return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    try {
        // On cherche les messages reçus (to_clone_id) qui sont en attente
        const { data, error } = await supabase
            .from('communications')
            .select('*')
            .eq('to_clone_id', profileId)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            notifications: data,
            count: data.length
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
