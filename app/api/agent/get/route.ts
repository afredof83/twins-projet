import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) return NextResponse.json({ error: "ID de l'Agent manquant" }, { status: 400 });

    try {
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: { dateOfBirth: true, postalCode: true, city: true, gender: true, country: true, thematicProfile: true, unifiedAnalysis: true }
        });

        return NextResponse.json({ success: true, profile });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
