import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMistralEmbedding } from '@/lib/mistral';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const { text, title, profileId } = await request.json();

        if (!text || text.length < 10) {
            return NextResponse.json({ error: "Texte trop court ou vide." }, { status: 400 });
        }

        // 1. Analyse Mistral
        const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: "mistral-small",
                messages: [
                    { role: "system", content: "Analyste TWINS. Traite ce texte brut comme une archive. Résume et structure les données clés (Markdown)." },
                    { role: "user", content: `Titre: ${title || "Entrée Manuelle"}\n\nContenu: ${text.substring(0, 30000)}` }
                ]
            })
        });

        const mistralData = await mistralResponse.json();
        const summary = mistralData.choices?.[0]?.message?.content || "Analyse impossible.";

        // 2. Vectorisation
        const embedding = await getMistralEmbedding(summary);

        // 3. Stockage
        await supabase.from('Memory').insert([{
            profileId,
            content: `[MANUEL] ${title || "Note Rapide"}\n\n${summary}`,
            type: 'knowledge',
            source: 'manual_input',
            embedding: embedding
        }]);

        return NextResponse.json({ success: true, summary });

    } catch (error: any) {
        console.error("❌ Erreur Manuel:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
