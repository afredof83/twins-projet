import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
    try {
        const { myId, partnerId } = await req.json();

        if (!myId || !partnerId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // 1. Supprimer le Canal
        const { error: channelError } = await supabase
            .from('Channel')
            .delete()
            .or(`and(member_one_id.eq.${myId},member_two_id.eq.${partnerId}),and(member_one_id.eq.${partnerId},member_two_id.eq.${myId})`);

        if (channelError) throw channelError;

        // 2. Supprimer la Négociation associée pour permettre un futur re-scan
        const { error: negError } = await supabase
            .from('Negotiation')
            .delete()
            .or(`and(initiatorId.eq.${myId},receiverId.eq.${partnerId}),and(initiatorId.eq.${partnerId},receiverId.eq.${myId})`);

        if (negError) throw negError;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Delete Link Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
