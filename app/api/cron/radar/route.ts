export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { executeRadarScan } from '@/app/actions/radar';

export async function GET(req: NextRequest) {
    // 1. Sécurité : Vérification du CRON_SECRET
    const authHeader = req.headers.get('Authorization');
    const secret = process.env.CRON_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
        console.error("🚨 [CRON-RADAR] Accès non autorisé bloqué.");
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Paramètres : Thématique visée
    const theme = req.nextUrl.searchParams.get('theme') || 'work';
    const validThemes = ['work', 'dating', 'hobby'];

    if (!validThemes.includes(theme)) {
        return NextResponse.json({ success: false, error: 'Invalid theme' }, { status: 400 });
    }

    console.log(`🚀 [CRON-RADAR] Démarrage du batch automatique Thème: ${theme}`);

    try {
        // 3. Batch Logic : On récupère tous les agents
        const users = await prisma.profile.findMany({
            select: { id: true }
        });

        let processedCount = 0;

        // 4. Boucle robuste pour éviter les crashs en série
        for (const user of users) {
            try {
                // Appel de la logique partagée (Analyse vectorielle + Mistral)
                await executeRadarScan(user.id, theme);
                processedCount++;
            } catch (userError: any) {
                console.error(`⚠️ [CRON-RADAR] Échec pour l'utilisateur ${user.id}:`, userError.message);
            }
        }

        return NextResponse.json({
            success: true,
            processedUsers: processedCount,
            totalUsers: users.length,
            theme
        });

    } catch (globalError: any) {
        console.error("🔥 [CRON-RADAR] Erreur critique du batch:", globalError.message);
        return NextResponse.json({ success: false, error: globalError.message }, { status: 500 });
    }
}
