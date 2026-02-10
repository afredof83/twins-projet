import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    const { fromId, toId, content } = await req.json();

    if (toId === 'GHOST_AI_SYSTEM') {
        // Le fantôme ne stocke rien, il écoute juste.
        return NextResponse.json({ success: true });
    }

    // Vraie sauvegarde si table existe
    // await supabase.from('Message').insert({ fromId, toId, content });

    return NextResponse.json({ success: true });
}
