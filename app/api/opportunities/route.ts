export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma, getPrismaForUser } from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';

async function getAuthUser(req: Request) {
    const authHeader = req.headers.get('Authorization');
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
    if (!user) throw new Error("Non autorisé");
    return user;
}

export async function GET(req: NextRequest) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const user = await getAuthUser(req);
        const prismaRLS = getPrismaForUser(user.id);
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (id) {
            const opp = await prismaRLS.opportunity.findUnique({
                where: { id },
                include: { sourceProfile: true, targetProfile: true }
            });
            if (!opp) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
            return NextResponse.json({ success: true, opportunity: opp });
        }

        const opportunities = await prismaRLS.opportunity.findMany({
            where: { OR: [{ sourceId: user.id }, { targetId: user.id }] },
            include: { sourceProfile: true, targetProfile: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ success: true, opportunities });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const user = await getAuthUser(req);
        const prismaRLS = getPrismaForUser(user.id);
        const myId = user.id;
        const body = await req.json();
        const { action, oppId, customTitle, status } = body;

        if (action === 'audit' && oppId) {
            const opp = await prismaRLS.opportunity.findUnique({
                where: { id: oppId },
                include: { sourceProfile: true, targetProfile: true }
            });
            if (!opp || !opp.sourceProfile || !opp.targetProfile) return NextResponse.json({ success: false, error: "Données introuvables" }, { status: 404 });

            const targetProfile = opp.sourceId === myId ? opp.targetProfile : opp.sourceProfile;
            const prompt = `Tu es le Cortex, une IA de renseignement stratégique B2B.\n\nRÈGLES DE SURVIE ABSOLUES :\n1. RÉPOND UNIQUEMENT EN JSON VALIDE.\n2. FORMATAGE : Interdiction astérisques, tirets, dièses.\n3. ACTIONS : 2 ou 3 actions ultra-concises.\n\nFORMAT ATTENDU :\n{"synergies": "[Nom] est [Métier]. Il cherche à [Objectif].", "actions": ["Action 1", "Action 2"]}\n\nCIBLE DÉTECTÉE (${targetProfile.name || 'La Cible'}) :\nRôle : ${targetProfile.role || 'Non défini'}\nBio : ${targetProfile.bio || 'Non définie'}`;

            const auditResponse = await mistralClient.chat.complete({
                model: 'mistral-large-latest',
                messages: [{ role: 'user', content: prompt }]
            });
            const content = auditResponse.choices[0]?.message.content;
            const auditResult = typeof content === 'string' ? content : "Erreur d'analyse.";
            await prismaRLS.opportunity.update({ where: { id: oppId }, data: { audit: auditResult, status: 'AUDITED' } });

            const updated = await prismaRLS.opportunity.findUnique({
                where: { id: oppId },
                include: { sourceProfile: true, targetProfile: true }
            });

            return NextResponse.json({ success: true, audit: auditResult, opportunity: updated });
        }

        if (action === 'sendChatInvite' || action === 'sendInvite') {
            const id = oppId;
            const opp = await prismaRLS.opportunity.findUnique({
                where: { id },
                include: { targetProfile: true, sourceProfile: true }
            });
            if (!opp) return NextResponse.json({ success: false, error: 'Opportunité introuvable' }, { status: 404 });
            await prismaRLS.opportunity.update({ where: { id }, data: { title: customTitle, status: 'INVITED' } });
            return NextResponse.json({ success: true });
        }

        if (action === 'acceptInvite' && oppId) {
            const opp = await prismaRLS.opportunity.findUnique({ where: { id: oppId } });
            if (!opp) return NextResponse.json({ success: false, error: 'Opportunité introuvable' }, { status: 404 });
            const newConnection = await prismaRLS.connection.create({
                data: { initiatorId: opp.sourceId, receiverId: opp.targetId, status: 'ACCEPTED' }
            });
            await prismaRLS.opportunity.update({ where: { id: oppId }, data: { status: 'ACCEPTED' } });
            return NextResponse.json({ success: true, connectionId: newConnection.id });
        }

        if (action === 'updateStatus' && oppId) {
            await prismaRLS.opportunity.update({ where: { id: oppId }, data: { status } });
            return NextResponse.json({ success: true });
        }

        if (action === 'scout') {
            const { forceHuntSync } = await import('@/app/actions/radar');
            await forceHuntSync();
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: 'Action non reconnue' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const user = await getAuthUser(req);
        const prismaRLS = getPrismaForUser(user.id);
        const body = await req.json();
        const { oppId } = body;
        if (!oppId) return NextResponse.json({ success: false, error: 'oppId manquant' }, { status: 400 });
        await prismaRLS.opportunity.delete({ where: { id: oppId } });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}