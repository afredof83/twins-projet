import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { profileId, country, age, gender, thematicProfile } = body;

        if (!profileId) throw new Error("ID Agent manquant.");

        // On s'assure que l'âge est bien un nombre (ou null)
        const parsedAge = age ? parseInt(age) : null;

        const updatedProfile = await prisma.profile.update({
            where: { id: profileId },
            data: {
                country: country,
                age: parsedAge,
                gender: gender,
                thematicProfile: thematicProfile
            }
        });

        console.log(`✅ [AGENT IA] Profil de ${updatedProfile.name} mis à jour avec succès.`);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("❌ [AGENT ERROR]", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
