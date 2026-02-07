import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const { fromId, toId, content } = await request.json();

        // Vérification basique
        if (!fromId || !toId || !content) {
            return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
        }

        const { error } = await supabase
            .from('Message')
            .insert([
                {
                    fromId,
                    toId,
                    content,
                    isRead: false
                }
            ]);

        if (error) {
            console.error("Erreur Supabase Send:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Erreur API Send:", e);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
