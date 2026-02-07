import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) return NextResponse.json({ notifications: [] });

    // On récupère les 10 derniers messages reçus
    const { data: messages, error } = await supabase
        .from('Message')
        .select('*')
        .eq('toId', profileId)
        .eq('isRead', false) // <--- AJOUTEZ CETTE LIGNE
        .order('createdAt', { ascending: false })
        .limit(10);

    if (error) return NextResponse.json({ notifications: [] });

    // On renvoie des objets structurés
    const notifications = messages.map((msg: any) => ({
        id: msg.id,
        fromId: msg.fromId, // CRUCIAL pour répondre
        content: msg.content,
        date: msg.createdAt,
        type: 'message'
    }));

    return NextResponse.json({ notifications });
}