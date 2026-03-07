export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { mistralClient } from '@/lib/mistral';

export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const body = await request.json();
        const { text, targetCountry } = body;
        if (!text) return NextResponse.json({ success: false, error: 'Texte manquant' }, { status: 400 });

        const response = await mistralClient.chat.complete({
            model: "mistral-large-latest",
            messages: [
                { role: "system", content: `Tu es un traducteur de l'extrême. Traduis fidèlement ce texte en ${targetCountry}. Renvoie UNIQUEMENT la traduction, sans aucun commentaire.` },
                { role: "user", content: text }
            ]
        });

        const translation = response.choices?.[0]?.message.content as string;
        return NextResponse.json({ success: true, translation });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
