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
        const idempotencyKey = request.headers.get('x-idempotency-key');
        const body = await request.json();
        const { action } = body;

        if (action === 'request') {
            const { targetId } = body;
            if (!targetId) return NextResponse.json({ success: false, error: 'Target ID missing (POST)' }, { status: 400 });
            if (user.id === targetId) return NextResponse.json({ success: false, error: 'Self connection not allowed' }, { status: 400 });

            // On utilise prisma (global) pour bypasser RLS sur la vérification de l'existence
            // (car on peut vouloir savoir si on est déjà connecté à quelqu'un d'autre)
            const existing = await prisma.connection.findFirst({
                where: { OR: [{ initiatorId: user.id, receiverId: targetId }, { initiatorId: targetId, receiverId: user.id }] }
            });
            if (existing) {
                console.log(`🛡️ [IDEMPOTENCY] Request already exists for ${user.id} -> ${targetId}. Key: ${idempotencyKey}`);
                return NextResponse.json({ success: true, message: 'Already requested', status: existing.status });
            }

            await prisma.connection.create({ data: { initiatorId: user.id, receiverId: targetId, status: "PENDING" } });

            // Si on vient d'un Radar, on met à jour le statut de l'opportunité
            const { oppId } = body;
            if (oppId) {
                await prisma.opportunity.update({
                    where: { id: oppId },
                    data: { status: 'INVITED' }
                });
            }

            return NextResponse.json({ success: true });
        }

        if (action === 'accept') {
            const { connectionId, oppId } = body;

            if (oppId) {
                // 🛡️ BYPASS RLS for Opportunity check (Consistency with /api/opportunities)
                const opp = await prisma.opportunity.findUnique({ where: { id: oppId } });
                if (!opp || (opp.sourceId !== user.id && opp.targetId !== user.id)) {
                    return NextResponse.json({ success: false, error: 'Opportunité introuvable ou non autorisée pour acceptation' }, { status: 404 });
                }

                // Check if opportunity is already accepted
                if (opp.status === 'ACCEPTED') {
                    console.log(`🛡️ [IDEMPOTENCY] Opportunity ${oppId} already accepted. Key: ${idempotencyKey}`);
                    return NextResponse.json({ success: true, message: 'Opportunity already accepted' });
                }

                // Acceptation idempotente : on cherche si une connexion existe déjà
                const existing = await prisma.connection.findFirst({
                    where: {
                        OR: [
                            { initiatorId: opp.sourceId, receiverId: opp.targetId },
                            { initiatorId: opp.targetId, receiverId: opp.sourceId }
                        ]
                    }
                });

                if (existing) {
                    await prisma.connection.update({
                        where: { id: existing.id },
                        data: { status: "ACCEPTED" }
                    });
                } else {
                    await prisma.connection.create({
                        data: { initiatorId: opp.sourceId, receiverId: opp.targetId, status: "ACCEPTED" }
                    });
                }

                await prisma.opportunity.update({ where: { id: oppId }, data: { status: "ACCEPTED" } });
                return NextResponse.json({ success: true });
            }

            const conn = await prisma.connection.findUnique({ where: { id: connectionId } });
            if (!conn) return NextResponse.json({ success: false, error: 'Connexion non trouvée' }, { status: 404 });
            
            if (conn.status === 'ACCEPTED') {
                console.log(`🛡️ [IDEMPOTENCY] Connection ${connectionId} already accepted. Key: ${idempotencyKey}`);
                return NextResponse.json({ success: true, message: 'Already accepted' });
            }

            const result = await prisma.connection.updateMany({
                where: { id: connectionId, receiverId: user.id, status: "PENDING" },
                data: { status: "ACCEPTED" }
            });
            if (result.count === 0) return NextResponse.json({ success: false, error: 'Accès refusé ou statut invalide' }, { status: 403 });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: `Action non reconnue: ${action}` }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}