export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';

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
    return user;
}

// GET /api/agent?profileId=xxx
export async function GET(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { searchParams } = new URL(request.url);
        const profileId = searchParams.get('profileId');
        if (!profileId) return NextResponse.json({ success: false, error: 'profileId manquant' }, { status: 400 });
        const profile = await prisma.profile.findUnique({ where: { id: profileId } });
        if (!profile) return NextResponse.json({ success: false, error: 'Profil introuvable' }, { status: 404 });
        return NextResponse.json({ success: true, profile });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

// POST /api/agent — updateAgentProfile or reflectAgent
export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        await getAuthUser(request);
        const body = await request.json();
        const { action } = body;

        if (action === 'update') {
            const { profileId, thematicProfile } = body;
            if (!profileId) return NextResponse.json({ success: false, error: 'profileId manquant' }, { status: 400 });
            const professionalStatus = thematicProfile?.travail?.professionalStatus || null;
            await prisma.profile.update({
                where: { id: profileId },
                data: { thematicProfile, primaryRole: professionalStatus }
            });
            return NextResponse.json({ success: true });
        }

        if (action === 'reflect') {
            const { profileId } = body;
            if (!profileId) return NextResponse.json({ success: false, error: 'profileId manquant' }, { status: 400 });
            const profile = await prisma.profile.findUnique({ where: { id: profileId } });
            if (!profile) return NextResponse.json({ success: false, error: 'Profil introuvable' }, { status: 404 });

            const prompt = `Tu es le Cortex de l'application Ipse. Fais une synthèse de ce profil en 3 phrases maximum.\nProfil: ${JSON.stringify(profile.thematicProfile || {})}\nBio: ${profile.bio || "Non renseignée"}`;
            const response = await mistralClient.chat.complete({ model: "mistral-large-latest", messages: [{ role: "user", content: prompt }] });
            const synthesis = response.choices?.[0]?.message.content as string;

            const embedResponse = await mistralClient.embeddings.create({ model: "mistral-embed", inputs: [synthesis] });
            const masterVector = embedResponse.data[0].embedding;
            await prisma.profile.update({ where: { id: profileId }, data: { unifiedAnalysis: synthesis } });
            await prisma.$executeRaw`UPDATE "Profile" SET "unifiedEmbedding" = ${masterVector}::vector WHERE id = ${profileId}`;
            return NextResponse.json({ success: true, synthesis });
        }

        return NextResponse.json({ success: false, error: 'Action non reconnue' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
