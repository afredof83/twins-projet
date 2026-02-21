import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const communicationId = searchParams.get('channelId');

    if (!communicationId) {
        return NextResponse.json({ error: 'Channel ID manquant' }, { status: 400 });
    }

    try {
        const { data: messages, error } = await supabase
            .from('Message')
            .select('id, communication_id, sender_id, content, created_at')
            .eq('communication_id', communicationId)
            .order('created_at', { ascending: true }); // Du plus ancien au plus récent pour le chat

        if (error) throw error;

        return NextResponse.json({ messages });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
