export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { mistralClient } from '@/lib/mistral';

// POST /api/guardian — guardianCheck or simulateNegotiation
export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'simulate') {
            const { myProfileId, targetProfileId } = body;
            if (!myProfileId || !targetProfileId) return NextResponse.json({ success: false, error: 'Ids manquants' }, { status: 400 });
            return NextResponse.json({
                success: true,
                summary: "Simulation : Le Gardien a intercepté un contact prometteur.",
                verdict: "MATCH",
                nextStep: "Proposer un NDA avant d'envoyer les plans."
            });
        }

        // Default: guardianCheck
        const { profileId, text } = body;
        if (!text || text.length < 5) return NextResponse.json({ success: true, isSafe: true, intervention: false });

        const triageResponse = await mistralClient.chat.complete({
            model: "mistral-small-latest",
            messages: [{ role: "user", content: `Ce texte est-il critique ou dangereux (menaces, spam violent, illégal) ? Réponds strictement par OUI ou NON. Texte: "${text}"` }]
        });

        const triageContent = triageResponse.choices?.[0]?.message.content;
        const triageDecision = typeof triageContent === 'string' ? triageContent : "";
        const isCritical = triageDecision.includes("OUI") || triageDecision.includes("oui");

        if (!isCritical) return NextResponse.json({ success: true, isSafe: true, intervention: false });

        const deepAuditResponse = await mistralClient.chat.complete({
            model: "mistral-large-latest",
            messages: [
                { role: "system", content: "Tu es le Gardien de sécurité Ipse. Analyse avancée de menace pour ce texte. Rédige un bref rapport sur le risque." },
                { role: "user", content: text }
            ]
        });

        return NextResponse.json({
            success: true,
            isSafe: false,
            intervention: true,
            report: deepAuditResponse.choices?.[0]?.message.content
        });

    } catch (error: any) {
        console.error("Guardian API Error:", error);
        return NextResponse.json({ success: true, isSafe: true, intervention: false });
    }
}
