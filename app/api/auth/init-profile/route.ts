export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    try {
        const authHeader = request.headers.get('Authorization');
        let token = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        if (!token) return NextResponse.json({ error: "Token manquant" }, { status: 401 });

        // On ignore volontairement les cookies pour éviter le crash "Invalid Refresh Token"
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { get() { return undefined; }, set() { }, remove() { } } }
        );

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return NextResponse.json({ error: "Token invalide" }, { status: 401 });
        }

        const body = await request.json();

        // ⚡ BYPASS RLS : Utilisation de Prisma Admin pour forcer la création
        const profile = await prisma.profile.upsert({
            where: { id: user.id },
            update: {},
            create: {
                id: user.id,
                email: user.email!,
                name: body.name || "Agent Furtif"
            }
        });

        return NextResponse.json({ success: true, profile });
    } catch (err: any) {
        console.error("Init Profile Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
