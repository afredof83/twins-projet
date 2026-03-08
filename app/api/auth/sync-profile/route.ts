export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

/**
 * IPSE - Auth Profile Synchronization Route
 * Called by mobile clients after login to ensure the Prisma profile exists.
 */
export async function POST(req: Request) {
    try {
        // 1. Bearer Token Extraction
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];

        // 2. Supabase Token Validation
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        // 3. Prisma Profile Upsert
        // We use the ID and Email from Supabase to create or refresh the profile.
        await prisma.profile.upsert({
            where: { id: user.id },
            update: {
                updatedAt: new Date() // Updates at the Prisma level
            },
            create: {
                id: user.id,
                email: user.email!
            },
        });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        // Fail-Safe: Don't leak internal details
        return NextResponse.json({ error: 'An internal error occurred during profile synchronization' }, { status: 500 });
    }
}
