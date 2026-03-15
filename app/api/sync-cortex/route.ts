export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';
import { trackAgentActivity } from '@/app/actions/missions';
import { createClientServer } from '@/lib/supabaseScoped';

// POST /api/sync-cortex — syncWebDataToCortex
export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { user, supabase } = await createClientServer(request);
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
        const updatedProfile = await prisma.profile.findUnique({ 
            where: { userId_type: { userId: user.id, type: 'WORK' } }, 
            select: { name: true, primaryRole: true } 
        });

        return NextResponse.json({ success: true, newStats: updatedProfile });
    } catch (e: any) {
        if (e.message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
