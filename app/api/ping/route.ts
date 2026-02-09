import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const { fromId, toId, reason } = await request.json();

        if (!fromId || !toId) return NextResponse.json({ error: "IDs manquants" }, { status: 400 });

        console.log(`[PING] De ${fromId} vers ${toId}. Raison: ${reason}`);

        // 1. On crée le message de "Demande"
        const { error } = await supabase
            .from('Message')
            .insert([{
                fromId,
                toId,
                content: reason || "📡 Demande de liaison neuronale.",
                isRead: false
            }]);

        if (error) throw error;

        return NextResponse.json({ success: true, message: "Signal transmis." });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}