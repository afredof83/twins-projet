export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';
import { trackAgentActivity } from '@/app/actions/missions';

async function getAuthUser(request: Request) {
    const authHeader = request.headers.get('Authorization');
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    if (token) return undefined;
                    return cookieStore.get(name)?.value;
                },
                set() { }, remove() { }
            }
        }
    );
    const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");
    return { user, supabase };
}

// POST /api/sync-cortex — syncWebDataToCortex
export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { user, supabase } = await getAuthUser(request);
        const body = await request.json();
        const { title, url, content } = body;

        const formattedContent = `[ÉCLAIREUR WEB] Titre: ${title}\nSource: ${url}\nExtrait: ${content}`;
        const embRes = await mistralClient.embeddings.create({ model: 'mistral-embed', inputs: [formattedContent] });

        const { error } = await supabase.from('memory').insert({
            id: crypto.randomUUID(),
            profile_id: user.id,
            content: formattedContent,
            type: 'knowledge',
            source: 'tavily_manual_sync',
            embedding: embRes.data[0].embedding
        });
        if (error) throw new Error(error.message);

        await trackAgentActivity(user.id, 'memory');
        const updatedProfile = await prisma.profile.findUnique({ where: { id: user.id }, select: { name: true, role: true } });

        return NextResponse.json({ success: true, newStats: updatedProfile });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
