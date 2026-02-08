import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// On force la connexion
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log("📥 Reçu pour sauvegarde:", body);

        const { content, type, profileId } = body;

        if (!content || !profileId) {
            return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
        }

        // Insertion simple sans chichis (pas de vecteur pour l'instant pour éviter les bugs)
        const { data, error } = await supabase
            .from('Memory')
            .insert([
                {
                    profileId: profileId,
                    content: content,
                    type: type || 'thought'
                }
            ])
            .select();

        if (error) {
            console.error("🔥 Erreur Supabase:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log("✅ Sauvegarde réussie:", data);
        return NextResponse.json({ success: true, data });

    } catch (e: any) {
        console.error("🔥 Crash API:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}