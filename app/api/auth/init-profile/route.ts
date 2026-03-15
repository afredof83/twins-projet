export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClientServer } from '@/lib/supabaseScoped';

export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    try {
        // 1. Authentification & Client Scoped (RLS Enforced)
        const { user } = await createClientServer(request);

        const body = await request.json();

        // ⚡ BYPASS RLS : Utilisation de Prisma Admin pour forcer la création
        const profile = await prisma.profile.upsert({
            where: { userId_type: { userId: user.id, type: 'WORK' } },
            update: {},
            create: {
                id: user.id,
                userId: user.id,
                email: user.email!,
                type: 'WORK',
                name: body.name || "Agent Furtif"
            }
        });

        return NextResponse.json({ success: true, profile });
    } catch (err: any) {
        console.error("Init Profile Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
