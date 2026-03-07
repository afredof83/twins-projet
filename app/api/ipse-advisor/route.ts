export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { mistralClient } from '@/lib/mistral';

export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const body = await request.json();
        const { decryptedContext } = body;
        if (!decryptedContext) return NextResponse.json({ success: false, error: 'Contexte manquant' }, { status: 400 });

        const prompt = `Tu es Ipse, le conseiller stratégique B2B.\nVoici les 5 derniers échanges :\n"""${decryptedContext}"""\nFournis UNE SEULE PHRASE tactique pour lui suggérer quoi répondre.`;
        const response = await mistralClient.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
        });
        return NextResponse.json({ success: true, advice: response.choices?.[0].message?.content as string });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
