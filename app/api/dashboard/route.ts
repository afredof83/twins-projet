import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Adapte le chemin si besoin

export const dynamic = 'force-dynamic'; // 👈 Très important pour éviter que Vercel mette en cache !

const USER_ID = "28de7876-17a4-4648-8f78-544dcea980f1"; // Ton ID fixe

export async function GET() {
    try {
        // 1. On récupère ton profil pour te dire "Bonjour"
        const profile = await prisma.profile.findUnique({
            where: { id: USER_ID }
        });

        // 2. On compte TOUTES les pépites trouvées pour toi
        const totalResults = await prisma.radarResult.count({
            where: { radar: { profileId: USER_ID } }
        });

        // 3. On récupère les 3 dernières pépites pour l'aperçu
        const recentResults = await prisma.radarResult.findMany({
            where: { radar: { profileId: USER_ID } },
            orderBy: { createdAt: 'desc' },
            take: 3
        });

        return NextResponse.json({
            profile,
            totalResults,
            recentResults
        });

    } catch (error) {
        console.error("Erreur Dashboard:", error);
        return NextResponse.json({ error: "Erreur lors du chargement des données" }, { status: 500 });
    }
}
