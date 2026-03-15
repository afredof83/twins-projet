export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClientServer } from '@/lib/supabaseScoped';

export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { user } = await createClientServer(request);

        const body = await request.json();
        const { profileId, token } = body;

        if (!profileId || !token) return NextResponse.json({ success: false, error: 'Paramètres manquants' }, { status: 400 });

        const updateResult = await prisma.profile.updateMany({
            where: { id: profileId, userId: user.id },
            data: { fcmToken: token }
        });

        if (updateResult.count === 0) {
            return NextResponse.json({ success: false, error: 'Profil introuvable ou non autorisé' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        if (e.message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}