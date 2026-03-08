import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPrismaForUser } from '@/lib/prisma';

export async function PATCH(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid token' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { language } = await req.json();
        if (!['fr', 'en'].includes(language)) {
            return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
        }

        const prismaRLS = getPrismaForUser(user.id);
        await prismaRLS.profile.update({
            where: { id: user.id },
            data: { language }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[SETTINGS_PATCH_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
