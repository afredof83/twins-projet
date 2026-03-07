export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma, getPrismaForUser } from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';
import { trackAgentActivity } from '@/app/actions/missions';

// ⚡ La fonction qui lit le Bearer Token
async function getAuthUser(request: Request) {
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
            global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
                set() { }, remove() { }
            }
        }
    );
    const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
    if (!user) throw new Error("Accès refusé.");
    return user;
}

async function vectorizeAndStoreMemory(memoryId: string, content: string) {
    try {
        const embeddingsResponse = await mistralClient.embeddings.create({
            model: 'mistral-embed',
            inputs: [content],
        });
        const embeddingVector = embeddingsResponse.data[0].embedding;
        await prisma.$executeRaw`
            UPDATE public.memory SET embedding = ${embeddingVector}::vector WHERE id = ${memoryId}
        `;
    } catch (error) {
        console.error(`❌ [VECTORISATION ERREUR]:`, error);
    }
}

// GET /api/memories
export async function GET(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { searchParams } = new URL(request.url);
        const profileId = searchParams.get('profileId');
        if (!profileId) return NextResponse.json({ success: false, error: 'profileId manquant' }, { status: 400 });

        const user = await getAuthUser(request);
        const prismaRLS = getPrismaForUser(user.id);

        const memories = await prismaRLS.memory.findMany({
            where: { profileId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return NextResponse.json({ success: true, memories });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

// POST /api/memories
export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const user = await getAuthUser(request);
        const contentType = request.headers.get('content-type') || '';

        // FILE UPLOAD (FormData)
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file') as File;
            const profileId = formData.get('profileId') as string || user.id;
            const textContext = formData.get('textContext') as string;
            const fileName = formData.get('fileName') as string;
            const hasFile = formData.get('hasFile') === 'true';

            if (textContext) {
                const cleanContent = textContext.replace(/\0/g, '');
                if (!cleanContent) return NextResponse.json({ success: false, error: 'Aucun contenu valide.' }, { status: 400 });

                const memory = await prisma.memory.create({
                    data: {
                        profileId: user.id,
                        content: cleanContent,
                        type: hasFile ? 'document' : 'thought',
                        source: fileName || 'manual'
                    }
                });
                await vectorizeAndStoreMemory(memory.id, cleanContent);
                return NextResponse.json({ success: true, memory });
            }

            if (!file) return NextResponse.json({ success: false, error: 'Fichier manquant' }, { status: 400 });
            const text = await file.text();
            const sanitizedText = text.replace(/\0/g, '');
            const memoryContent = `[FICHIER: ${file.name}]\n\n${sanitizedText}`;

            const memory = await prisma.memory.create({
                data: { profileId, content: memoryContent, type: 'document', source: file.name }
            });
            await vectorizeAndStoreMemory(memory.id, memoryContent);
            return NextResponse.json({ success: true, memory });
        }

        // JSON actions
        const body = await request.json();
        const { action } = body;

        if (action === 'addMemory') {
            const { profileId, content, type = 'thought', source = 'manual' } = body;
            const memory = await prisma.memory.create({
                data: { profileId: profileId || user.id, content, type, source }
            });
            await vectorizeAndStoreMemory(memory.id, content);
            return NextResponse.json({ success: true, memory });
        }

        if (action === 'scrapeUrl') {
            const { url, profileId } = body;
            if (!url) return NextResponse.json({ success: false, error: 'URL manquante' }, { status: 400 });

            const response = await fetch('https://api.tavily.com/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, urls: [url] })
            });
            if (!response.ok) throw new Error("Erreur extraction URL");

            const data = await response.json();
            const content = data?.results?.[0]?.rawContent || "Aucun contenu";
            const memoryContent = `[EXTRACTION ${url}] ${content.substring(0, 1000)}`;

            const memory = await prisma.memory.create({
                data: { profileId: profileId || user.id, content: memoryContent, type: 'scraped', source: url }
            });
            await vectorizeAndStoreMemory(memory.id, memoryContent);
            return NextResponse.json({ success: true, content, memory });
        }

        return NextResponse.json({ success: false, error: 'Action non reconnue' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

// PATCH /api/memories
export async function PATCH(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const user = await getAuthUser(request);
        const body = await request.json();
        const { memoryId, newContent } = body;

        if (!memoryId || !newContent) return NextResponse.json({ success: false, error: 'Params manquants' }, { status: 400 });

        const embedResponse = await mistralClient.embeddings.create({
            model: 'mistral-embed',
            inputs: [newContent]
        });
        const newVector = embedResponse.data[0].embedding;

        await prisma.$executeRaw`
            UPDATE public.memory SET content = ${newContent}, embedding = ${newVector}::vector WHERE id = ${memoryId}
        `;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

// DELETE /api/memories
export async function DELETE(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const user = await getAuthUser(request);
        const body = await request.json();
        const { memoryId } = body;

        if (!memoryId) return NextResponse.json({ success: false, error: 'memoryId manquant' }, { status: 400 });

        await prisma.memory.delete({ where: { id: memoryId } });
        await trackAgentActivity(user.id, 'memory_delete');

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}