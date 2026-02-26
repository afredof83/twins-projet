import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assure-toi que ce chemin correspond à ton projet

// Ton ID unique (on le garde en dur tant qu'on n'a pas de système de connexion complet)
const USER_ID = "28de7876-17a4-4648-8f78-544dcea980f1";

// 1. LIRE les infos actuelles (GET)
export async function GET() {
    try {
        const profile = await prisma.profile.findUnique({
            where: { id: USER_ID }
        });
        return NextResponse.json(profile);
    } catch (error) {
        return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
    }
}

// 2. METTRE À JOUR les infos (POST)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const updatedProfile = await prisma.profile.update({
            where: { id: USER_ID },
            data: {
                // Adapté selon ton schema.prisma actuel
                name: body.name,
                city: body.city,
                industry: body.industry
            }
        });

        return NextResponse.json({ success: true, profile: updatedProfile });
    } catch (error) {
        return NextResponse.json({ error: "Erreur de sauvegarde" }, { status: 500 });
    }
}
