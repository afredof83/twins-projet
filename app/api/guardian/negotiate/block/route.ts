
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
    try {
        const { blockerId, blockedId, negotiationId } = await req.json();

        if (!blockerId || !blockedId) {
            return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });
        }

        // 1. Ajouter à la liste noire
        const { error } = await supabase.from('BlockList').insert([{ blockerId, blockedId }]);

        if (error) {
            console.error("BlockList insert error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 2. Nettoyer la négociation en cours pour libérer le Gardien
        if (negotiationId) {
            await supabase.from('Negotiation').delete().eq('id', negotiationId);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
