import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'UserId requis' }, { status: 400 });

    const results = await prisma.opportunity.findMany({
        where: { profileId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20 // On prend les 20 dernières
    });

    return NextResponse.json(results);
}
