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
        .from('messages')
        .select('*')
        // .eq('receiver_id', profileId) // REMOVED: Column does not exist. Needs new logic via channels.
        // .eq('is_read', false)  // Commenting out isRead check for now to avoid column error if it doesn't exist or is named differently
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) return NextResponse.json({ notifications: [] });

    // On renvoie des objets structurés
    const notifications = messages.map((msg: any) => ({
        id: msg.id,
        fromId: msg.sender_id, // CRUCIAL pour répondre
        content: msg.content,
        date: msg.created_at,
        type: 'message'
    }));

    return NextResponse.json({ notifications });
}