import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    try {
        const { communicationId, senderId, content } = await req.json();

        if (!communicationId || !senderId || !content) {
            return NextResponse.json({ error: 'Données de transmission incomplètes' }, { status: 400 });
        }

        // Insertion standardisée (snake_case)
        const { data, error } = await supabase
            .from('Message') // Assurez-vous que la majuscule correspond à votre table
            .insert({
                communication_id: communicationId,
                sender_id: senderId,
                content: content,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, message: data });
    } catch (error: any) {
        console.error("Erreur Transmission:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
