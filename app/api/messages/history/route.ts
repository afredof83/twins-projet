
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const myId = searchParams.get('myId');
    const contactId = searchParams.get('contactId');

    if (!myId || !contactId) return NextResponse.json({ messages: [] });

    // On cherche tous les messages échangés entre ces deux personnes (envoyés OU reçus)
    const { data, error } = await supabase
        .from('Message')
        .select('*')
        .or(`and(fromId.eq.${myId},toId.eq.${contactId}),and(fromId.eq.${contactId},toId.eq.${myId})`)
        .order('createdAt', { ascending: true }); // Du plus vieux au plus récent

    return NextResponse.json({ messages: data || [] });
}
