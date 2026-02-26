import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'UserId requis' }, { status: 400 });

    const results = await prisma.radarResult.findMany({
        where: {
            radar: {
                profileId: userId // On utilise la colonne profileId de la table Radar
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    return NextResponse.json(results);
}
