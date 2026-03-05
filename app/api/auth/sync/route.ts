import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return cookieStore.getAll() } } }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
        });

        if (!profile) {
            return NextResponse.json({ error: "Ghost" }, { status: 404 });
        }

        return NextResponse.json({ active: true });
    } catch (error) {
        console.error("Critical Sync Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}