export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClientServer } from '@/lib/supabaseScoped';

export async function GET(req: NextRequest) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { user } = await createClientServer(req);
        const myId = user.id;
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (id) {
            const opp = await prisma.opportunity.findUnique({
                where: { id },
                include: { sourceProfile: true, targetProfile: true }
            });

            if (!opp) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

            if (opp.sourceProfile.userId !== myId && opp.targetProfile.userId !== myId) {
                return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 403 });
            }

            return NextResponse.json({ success: true, opportunity: opp });
        }

        const opportunities = await prisma.opportunity.findMany({
            where: {
                OR: [
                    { sourceProfile: { userId: myId } },
                    { targetProfile: { userId: myId } }
                ]
            },
            include: { sourceProfile: true, targetProfile: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, opportunities });
    } catch (e: any) {
        console.error("Opportunities GET Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { user } = await createClientServer(req);
        const myId = user.id;
        const body = await req.json();
        const { action, oppId, customTitle, status } = body;

        // ==========================================
        // 🚀 ACTION: SCOUT (Le Radar Moteur)
        // ==========================================
        if (action === 'scout') {
            const myProfile = await prisma.profile.findFirst({
                where: { userId: myId }
            });

            if (!myProfile) {
                return NextResponse.json({ success: false, error: "Créez d'abord votre profil." }, { status: 400 });
            }

            const existingOpps = await prisma.opportunity.findMany({
                where: { sourceId: myProfile.id },
                select: { targetId: true }
            });
            const ignoredIds = existingOpps.map(opp => opp.targetId);

            const potentialTargets = await prisma.profile.findMany({
                where: {
                    userId: { not: myId },
                    id: { notIn: ignoredIds }
                },
                take: 3
            });

            if (potentialTargets.length === 0) {
                return NextResponse.json({ success: true, message: "Aucune nouvelle synergie", created: 0 });
            }

            const createdOpps = [];

            for (const target of potentialTargets) {
                // FIX: Score en ENTIER pour plaire à PostgreSQL (ex: 85)
                const mockScore = Math.floor(Math.random() * (98 - 80 + 1)) + 80;

                const opp = await prisma.opportunity.create({
                    data: {
                        sourceId: myProfile.id,
                        targetId: target.id,
                        title: `Synergie identifiée`,
                        context: "Analyse sémantique croisée : vos objectifs récents s'alignent avec ce profil.",
                        match_score: mockScore,
                        status: "PENDING", // En attente de l'évaluation IA
                        synergies: {
                            score: mockScore,
                            reasons: ["En attente d'audit Cortex profond..."]
                        }
                    }
                });
                createdOpps.push(opp);
            }

            console.log(`✅ [RADAR] ${createdOpps.length} nouvelles opportunités générées`);
            return NextResponse.json({ success: true, created: createdOpps.length });
        }

        // ==========================================
        // AUTRES ACTIONS
        // ==========================================
        if (action === 'sendChatInvite' || action === 'sendInvite') {
            const opp = await prisma.opportunity.findUnique({ where: { id: oppId }, include: { sourceProfile: true, targetProfile: true } });
            if (!opp || (opp.sourceProfile.userId !== myId && opp.targetProfile.userId !== myId)) return NextResponse.json({ success: false, error: 'Non trouvé' }, { status: 404 });
            await prisma.opportunity.update({ where: { id: oppId }, data: { title: customTitle, status: 'INVITED' } });
            return NextResponse.json({ success: true });
        }

        if (action === 'acceptInvite' && oppId) {
            const opp = await prisma.opportunity.findUnique({ where: { id: oppId }, include: { sourceProfile: true, targetProfile: true } });
            if (!opp || (opp.sourceProfile.userId !== myId && opp.targetProfile.userId !== myId)) return NextResponse.json({ success: false, error: 'Non trouvé' }, { status: 404 });

            const newConnection = await prisma.connection.create({
                data: { initiatorId: opp.sourceId, receiverId: opp.targetId, status: 'ACCEPTED' }
            });
            await prisma.opportunity.update({ where: { id: oppId }, data: { status: 'ACCEPTED' } });
            return NextResponse.json({ success: true, connectionId: newConnection.id });
        }

        if (action === 'updateStatus' && oppId) {
            const opp = await prisma.opportunity.findUnique({ where: { id: oppId }, include: { sourceProfile: true, targetProfile: true } });
            if (!opp || (opp.sourceProfile.userId !== myId && opp.targetProfile.userId !== myId)) return NextResponse.json({ success: false, error: 'Non trouvé' }, { status: 404 });
            await prisma.opportunity.update({ where: { id: oppId }, data: { status } });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: 'Action non reconnue' }, { status: 400 });
    } catch (e: any) {
        console.error("Opportunities POST Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}