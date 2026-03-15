export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClientServer } from '@/lib/supabaseScoped';

export async function GET(req: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        // 1. Authentification & Client Scoped (RLS Enforced)
        const { user } = await createClientServer(req);

        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }



        // 3. Synchronisation du profil (grâce à la nouvelle politique INSERT)
        const profile = await prisma.profile.upsert({
            where: { userId_type: { userId: user.id, type: 'WORK' } },
            update: {
                email: user.email!,
                // Mets à jour d'autres champs si nécessaire
            },
            create: {
                id: user.id,
                userId: user.id,
                email: user.email!,
                type: 'WORK'
                // Assigne les champs par défaut
            }
        });

        return NextResponse.json({ success: true, profile });

    } catch (error) {
        console.error("Erreur de synchronisation Auth:", error);
        return NextResponse.json({ error: "Erreur serveur critique" }, { status: 500 });
    }
}