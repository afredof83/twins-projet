import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { profileId, token } = body;

        if (!profileId || !token) {
            return NextResponse.json({ error: "profileId et token sont requis." }, { status: 400 });
        }

        // Mise à jour stricte du profil utilisateur
        await prisma.profile.update({
            where: { id: profileId },
            data: { pushToken: token }
        });

        console.log(`💾 [DB] PushToken mis à jour pour le profil: ${profileId}`);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("❌ [DB] Erreur lors de la sauvegarde du token:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
