import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;

        // On récupère uniquement les infos publiques nécessaires au déchiffrement
        const profile = await prisma.profile.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                saltBase64: true,
                passwordHash: true, // Sert à vérifier le mot de passe client-side, pas à déchiffrer
            },
        });

        if (!profile) {
            return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
        }

        return NextResponse.json(profile);
    } catch (error) {
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
