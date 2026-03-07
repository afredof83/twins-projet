export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    // 🛡️ Sécurité : Vérifie que l'appel vient bien de Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        // 🔍 Logique : Récupérer les opportunités "AUDITED" non encore traitées
        const topMatches = await prisma.opportunity.findMany({
            where: { status: 'AUDITED' },
            take: 3,
            include: { targetProfile: true }
        });

        if (topMatches.length > 0) {
            // 📲 Ici : Appel à ton service de notification (Push/Email)
            console.log(`[CRON] Envoi du briefing pour ${topMatches.length} opportunités.`);
        }

        return NextResponse.json({ success: true, processed: topMatches.length });
    } catch (e) {
        return NextResponse.json({ success: false, error: e }, { status: 500 });
    }
}
