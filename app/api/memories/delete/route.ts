import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    try {
        const { ids } = await req.json(); // On reçoit un tableau d'IDs

        if (!ids || ids.length === 0) return NextResponse.json({ error: "Aucun ID" }, { status: 400 });

        const { error } = await supabase
            .from('Memory')
            .delete()
            .in('id', ids);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}