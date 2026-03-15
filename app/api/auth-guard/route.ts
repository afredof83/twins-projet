export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClientServer } from '@/lib/supabaseScoped';

export async function GET(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { user } = await createClientServer(request);
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) return NextResponse.json({ exists: false }, { status: 400 });

        const profile = await prisma.profile.findFirst({
            where: { id: userId, userId: user.id },
            select: { id: true }
        });

        return NextResponse.json({ exists: !!profile });
    } catch (e: any) {
        if (e.message === 'Unauthorized') {
            return NextResponse.json({ exists: false, error: 'Non autorisé' }, { status: 401 });
        }
        return NextResponse.json({ exists: false, error: e.message }, { status: 500 });
    }
}
