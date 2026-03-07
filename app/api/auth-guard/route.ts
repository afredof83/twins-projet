export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getPrismaForUser } from '@/lib/prisma';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getAuthUser(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return null;

    const authHeader = request.headers.get('Authorization');
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    // ⚡ CORRECTION : Si on a un Bearer Token, on ignore les vieux cookies
                    if (token) return undefined;
                    return cookieStore.get(name)?.value;
                },
                set() { }, remove() { }
            }
        }
    );

    if (token) {
        const { data: { user } } = await supabase.auth.getUser(token);
        return user;
    } else {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    }
}

export async function GET(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) return NextResponse.json({ exists: false }, { status: 400 });

        const user = await getAuthUser(request);
        if (!user) return NextResponse.json({ exists: false }, { status: 401 });

        const prismaRLS = getPrismaForUser(user.id);
        const profile = await prismaRLS.profile.findUnique({
            where: { id: userId },
            select: { id: true }
        });

        return NextResponse.json({ exists: !!profile });
    } catch (e: any) {
        return NextResponse.json({ exists: false, error: e.message }, { status: 500 });
    }
}
