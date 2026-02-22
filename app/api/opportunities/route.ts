import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    try {
        // On récupère les 10 dernières opportunités de l'Agent
        const opps = await prisma.opportunity.findMany({
            where: { profileId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        return NextResponse.json({ success: true, opportunities: opps });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 🔴 NOUVEAU : Protocole de destruction
export async function DELETE(req: Request) {
    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "ID du rapport manquant" }, { status: 400 });
        }

        // Suppression de la ligne dans la base de données
        await prisma.opportunity.delete({
            where: { id }
        });

        console.log(`🗑️ [ÉCLAIREUR] Rapport d'interception ${id} détruit.`);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("❌ Erreur de suppression :", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
