import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import prisma from '@/lib/prisma';

export async function GET() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { id: true }
    });

    if (!profile) return new NextResponse("Ghost Profile", { status: 404 });

    return NextResponse.json({ active: true });
}
