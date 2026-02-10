import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    const { data: memories } = await supabase
        .from('Memory')
        .select('*')
        .eq('profileId', profileId)
        .order('createdAt', { ascending: false })
        .limit(50);

    return NextResponse.json({ memories: memories || [] });
}