import { prisma } from '@/lib/prisma'; // Vérifie que ce chemin est correct vers ton client prisma
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const pid = searchParams.get('profileId');

    if (!pid) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 });

    try {
        // Prisma gère automatiquement la casse (profileId)
        const memories = await prisma.memory.findMany({
            where: {
                profileId: pid
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ memories });
    } catch (error: any) {
        console.error("Erreur lecture Prisma:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { content, profileId, type } = body;

        const newMemory = await prisma.memory.create({
            data: {
                content,
                profileId,
                type: type || 'THOUGHT',
            }
        });

        return NextResponse.json(newMemory);
    } catch (error: any) {
        console.error("Erreur sauvegarde Prisma:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
