export const dynamic = 'force-dynamic'; // ⚡ LE CORRECTIF ANTI-CACHE EST ICI
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPrismaForUser } from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';

// ⚡ Fonction robuste qui lit le Bearer Token et configure Supabase
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
            global: {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            },
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
                set() { }, remove() { }
            }
        }
    );

    try {
        const { data: { user }, error } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
        if (error) console.error("🚨 Supabase Auth Error:", error.message);
        if (!user) return null;
        return { user, supabase };
    } catch (e) {
        console.error("🚨 Fatal Auth Error:", e);
        return null;
    }
}

// GET /api/cortex
export async function GET(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, profile: { files: [], memories: [] } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const auth = await getAuthUser(request);
        if (!auth) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

        const { user } = auth;
        const prismaRLS = getPrismaForUser(user.id);

        const profile = await prismaRLS.profile.findUnique({
            where: { id: user.id },
            include: {
                files: { orderBy: { createdAt: 'desc' } },
                memories: { orderBy: { createdAt: 'desc' } }
            }
        });

        if (!profile) return NextResponse.json({ success: false, error: 'Profil introuvable' }, { status: 404 });
        return NextResponse.json({ success: true, profile });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

// POST /api/cortex
export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const auth = await getAuthUser(request);
        if (!auth) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

        const { user, supabase } = auth;
        const prismaRLS = getPrismaForUser(user.id);
        const body = await request.json();
        const { action } = body;

        if (action === 'deleteMemory') {
            const { fileId, fileUrl } = body;
            if (!fileId || !fileUrl) return NextResponse.json({ success: false, error: 'Params manquants' }, { status: 400 });
            await supabase.storage.from('cortex_files').remove([fileUrl]);
            await prismaRLS.fileArchive.delete({ where: { id: fileId, profileId: user.id } });
            return NextResponse.json({ success: true });
        }

        if (action === 'deleteNote') {
            const { noteId } = body;
            if (!noteId) return NextResponse.json({ success: false, error: 'noteId manquant' }, { status: 400 });
            await prismaRLS.cortexNote.delete({ where: { id: noteId, profileId: user.id } });
            return NextResponse.json({ success: true });
        }

        if (action === 'deleteCortexMemory') {
            const { memoryId } = body;
            if (!memoryId) return NextResponse.json({ success: false, error: 'memoryId manquant' }, { status: 400 });
            await prismaRLS.memory.delete({ where: { id: memoryId, profileId: user.id } });
            return NextResponse.json({ success: true });
        }

        if (action === 'analyzeGaps') {
            const profile = await prismaRLS.profile.findUnique({ where: { id: user.id } });
            if (!profile) return NextResponse.json(null);

            let missingField: 'bio' | 'primaryRole' | 'tjm' | null = null;
            if (!profile.primaryRole || profile.primaryRole === 'Nouveau' || profile.primaryRole === '') missingField = 'primaryRole';
            else if (!profile.tjm || profile.tjm === 0) missingField = 'tjm';
            else if (!profile.bio || profile.bio === '') missingField = 'bio';
            if (!missingField) return NextResponse.json(null);

            try {
                const prompt = `Tu es Cortex. Le champ prioritaire manquant est : "${missingField}".\nPose UNE SEULE question courte (max 12 mots).\nProfil: Rôle=${profile.primaryRole || 'Inconnu'}, TJM=${profile.tjm || 'Inconnu'}, Bio=${profile.bio || 'Inconnue'}`;
                const chatResponse = await mistralClient.chat.complete({ model: 'mistral-large-latest', messages: [{ role: 'user', content: prompt }], temperature: 0.7 });
                const content = chatResponse.choices?.[0].message.content;
                const question = typeof content === 'string' ? content.replace(/[""]/g, '').trim() : null;
                if (question) return NextResponse.json({ question, field: missingField });
            } catch (e) {
                return NextResponse.json({
                    question: missingField === 'primaryRole' ? "Quel est ton rôle ?" : missingField === 'tjm' ? "Quel est ton TJM ?" : "En quelques mots, ton parcours ?",
                    field: missingField
                });
            }
            return NextResponse.json(null);
        }

        if (action === 'updateIdentity') {
            const { answer, field } = body;
            let updateData: any = {};
            if (field === 'tjm') updateData.tjm = parseInt(answer, 10);
            else {
                const currentProfile = await prismaRLS.profile.findUnique({ where: { id: user.id } });
                if (field === 'bio' && currentProfile?.bio) updateData.bio = `${currentProfile.bio}\n\n[Mise à jour Agent]: ${answer}`;
                else updateData[field] = answer;
            }
            await prismaRLS.profile.update({ where: { id: user.id }, data: updateData });
            return NextResponse.json({ success: true });
        }

        if (action === 'deleteDiscovery') {
            const { id } = body;
            if (!id) return NextResponse.json({ success: false, error: 'id manquant' }, { status: 400 });
            await prismaRLS.discovery.delete({ where: { id, profileId: user.id } });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: 'Action non reconnue' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}