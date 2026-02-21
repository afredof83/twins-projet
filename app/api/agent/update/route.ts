import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { profileId, country, thematicProfile } = body;

        if (!profileId) throw new Error("ID Agent manquant.");

        // Mise à jour des nouvelles données dans la base
        const updatedProfile = await prisma.profile.update({
            where: { id: profileId },
            data: {
                country: country,
                thematicProfile: thematicProfile // Le fameux champ JSON qui stocke les 3 onglets
            }
        });

        console.log(`✅ [AGENT IA] Matrice de ${updatedProfile.name} mise à jour avec succès.`);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("❌ [AGENT ERROR]", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
