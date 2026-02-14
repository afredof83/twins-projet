import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
    try {
        const { myId, targetId } = await req.json();

        // On vérifie s'il n'y a pas déjà une négociation active
        const { data: existing } = await supabase
            .from('Negotiation')
            .select('id')
            .match({ initiatorId: myId, receiverId: targetId })
            .neq('status', 'ARCHIVED')
            .maybeSingle();

        if (existing) return NextResponse.json({ negotiationId: existing.id });

        // Sinon, on crée la nouvelle négociation
        const { data, error } = await supabase
            .from('Negotiation')
            .insert([{
                initiatorId: myId,
                receiverId: targetId,
                status: 'ACTIVE',
                verdict: 'ANALYSE EN COURS'
            }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ negotiationId: data.id });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
