import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const { ids } = await request.json(); // On attend une liste d'IDs (ex: ["123", "456"])

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "Aucun ID fourni" }, { status: 400 });
        }

        // Suppression en masse
        const { error } = await supabase
            .from('Memory')
            .delete()
            .in('id', ids);

        if (error) throw error;

        return NextResponse.json({ success: true, count: ids.length });

    } catch (e: any) {
        console.error("Erreur suppression:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}