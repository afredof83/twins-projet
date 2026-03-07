export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    const searchParams = req.nextUrl.searchParams;
    const receiverId = searchParams.get('receiverId');

    if (!receiverId) {
        return NextResponse.json({ success: false, error: "receiverId is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    if (process.env.BUILD_TARGET === 'mobile') return NextResponse.json({ success: true, messages: [], receiverProfile: null });
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: user.id, receiverId: receiverId },
                    { senderId: receiverId, receiverId: user.id }
                ]
            },
            take: 50,
            orderBy: { createdAt: 'desc' }
        });

        const receiverProfile = await prisma.profile.findUnique({
            where: { id: receiverId },
            select: { publicKey: true, name: true }
        });

        return NextResponse.json({
            success: true,
            messages: messages.reverse(),
            receiverProfile
        });
    } catch (e) {
        console.error("Chat history fetch error", e);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
