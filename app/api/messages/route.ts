import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// 1. RÉCUPÉRER L'HISTORIQUE
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const commId = searchParams.get('commId');

    if (!commId) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('communication_id', commId)
        .order('created_at', { ascending: true }); // Du plus vieux au plus récent

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data });
}

// 2. ENVOYER UN MESSAGE
export async function POST(req: NextRequest) {
    try {
        const { commId, senderId, content } = await req.json();

        const { data, error } = await supabase
            .from('messages')
            .insert({
                communication_id: commId,
                sender_id: senderId,
                content: content
            })
            .select();

        if (error) throw error;

        return NextResponse.json({ success: true, message: data[0] });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
