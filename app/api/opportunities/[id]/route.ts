import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        // LA MAGIE EST ICI : On "déballe" les paramètres avec await
        const resolvedParams = await params;

        // On utilise l'ID déballé
        const opp = await prisma.opportunity.findUnique({
            where: { id: resolvedParams.id }
        });

        if (!opp) {
            return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 });
        }

        return NextResponse.json(opp);
    } catch (error) {
        console.error("Erreur API:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
