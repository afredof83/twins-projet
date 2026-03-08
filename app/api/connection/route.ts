export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma, getPrismaForUser } from '@/lib/prisma';

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
    if (!user) return null;
    return user;
}

export async function GET(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, incoming: [], active: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const user = await getAuthUser(request);
        if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

        const prismaRLS = getPrismaForUser(user.id);
        const incoming = await prismaRLS.connection.findMany({
            where: { receiverId: user.id, status: "PENDING" },
            include: { initiator: true },
            orderBy: { createdAt: 'desc' }
        });
        const active = await prismaRLS.connection.findMany({
            where: { OR: [{ initiatorId: user.id }, { receiverId: user.id }], status: "ACCEPTED" },
            include: { initiator: true, receiver: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, incoming, active });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const user = await getAuthUser(request);
        if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

        const prismaRLS = getPrismaForUser(user.id);
        const body = await request.json();
        const { action } = body;

        if (action === 'request') {
            const { targetId } = body;
            if (!targetId) return NextResponse.json({ success: false, error: 'Target ID missing' }, { status: 400 });
            if (user.id === targetId) return NextResponse.json({ success: false, error: 'Self connection not allowed' }, { status: 400 });

            const existing = await prismaRLS.connection.findFirst({
                where: { OR: [{ initiatorId: user.id, receiverId: targetId }, { initiatorId: targetId, receiverId: user.id }] }
            });
            if (existing) return NextResponse.json({ success: false, error: 'Connexion déjà existante' });

            await prismaRLS.connection.create({ data: { initiatorId: user.id, receiverId: targetId, status: "PENDING" } });

            // Si on vient d'un Radar, on met à jour le statut de l'opportunité
            const { oppId } = body;
            if (oppId) {
                await prismaRLS.opportunity.update({
                    where: { id: oppId },
                    data: { status: 'INVITED' }
                });
            }

            return NextResponse.json({ success: true });
        }

        if (action === 'accept') {
            const { connectionId, oppId } = body;

            if (oppId) {
                const opp = await prismaRLS.opportunity.findUnique({ where: { id: oppId } });
                if (!opp) return NextResponse.json({ success: false, error: 'Opportunité introuvable' }, { status: 404 });

                await prismaRLS.connection.create({
                    data: { initiatorId: opp.sourceId, receiverId: opp.targetId, status: "ACCEPTED" }
                });
                await prismaRLS.opportunity.update({ where: { id: oppId }, data: { status: "ACCEPTED" } });
                return NextResponse.json({ success: true });
            }

            if (!connectionId) return NextResponse.json({ success: false, error: 'connectionId manquant' }, { status: 400 });
            const result = await prismaRLS.connection.updateMany({
                where: { id: connectionId, receiverId: user.id, status: "PENDING" },
                data: { status: "ACCEPTED" }
            });
            if (result.count === 0) return NextResponse.json({ success: false, error: 'Non trouvé ou non autorisé' }, { status: 404 });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: 'Action non reconnue' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}