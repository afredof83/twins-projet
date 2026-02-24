import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { profileId, country, dateOfBirth, postalCode, city, gender, thematicProfile } = body;

        if (!profileId) throw new Error("ID Agent manquant.");

        const updatedProfile = await prisma.profile.update({
            where: { id: profileId },
            data: {
                country: country,
                dateOfBirth: dateOfBirth,
                postalCode: postalCode,
                city: city,
                gender: gender,
                thematicProfile: thematicProfile,
                // MAP NESTED FORMDATA TO TOP-LEVEL COLUMNS
                industry: thematicProfile?.travail?.industry || null,
                seniority: thematicProfile?.travail?.seniority || null,
                professionalStatus: thematicProfile?.travail?.professionalStatus || null,
                environment: thematicProfile?.travail?.environment || null,
                objectives: thematicProfile?.travail?.objectives ? [thematicProfile.travail.objectives] : [],
                workNuances: thematicProfile?.travail?.precisionsLibres || null,
                ikigaiMission: thematicProfile?.ikigai?.ikigaiMission || null,
                ikigaiValues: thematicProfile?.ikigai?.ikigaiValues ? [thematicProfile.ikigai.ikigaiValues] : [],
                dealbreakers: thematicProfile?.ikigai?.dealbreakers ? [thematicProfile.ikigai.dealbreakers] : [],
                socialStyle: thematicProfile?.ikigai?.socialStyle || null,
            }
        });

        console.log(`✅ [AGENT IA] Profil mis à jour avec la nouvelle géolocalisation.`);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("❌ [AGENT ERROR]", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
