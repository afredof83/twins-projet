export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClientServer } from '@/lib/supabaseScoped';

export async function GET(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, incoming: [], active: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { user } = await createClientServer(request);


        
        // On cherche les profils WORK de l'utilisateur pour servir de base aux connexions (si l'app est mono-prism-UI pour l'instant)
        // Mais techniquement une connexion lie deux Profile.id.
        // On récupère toutes les connexions impliquant l'USER ID via ses profils.
        
        const incoming = await prisma.connection.findMany({
            where: { 
                receiver: { userId: user.id }, 
                status: "PENDING" 
            },
            include: { initiator: true },
            orderBy: { createdAt: 'desc' }
        });
        const active = await prisma.connection.findMany({
            where: { 
                OR: [
                    { initiator: { userId: user.id } }, 
                    { receiver: { userId: user.id } }
                ], 
                status: "ACCEPTED" 
            },
            include: { initiator: true, receiver: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, incoming, active });
    } catch (e: any) {
        if (e.message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }
        console.error("Connection GET Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { user } = await createClientServer(request);


        const idempotencyKey = request.headers.get('x-idempotency-key');
        const body = await request.json();
        const { action } = body;

        if (action === 'request') {
            const { targetId, oppId } = body;
            console.log(`[API Connection] Processing request: targetId=${targetId}, oppId=${oppId}, userId=${user.id}`);
            
            if (!targetId) {
                console.error("[API Connection] Target ID missing");
                return NextResponse.json({ success: false, error: 'Target ID missing (POST)' }, { status: 400 });
            }

            // On doit identifier NOTRE profile ID source (celui avec lequel on envoie l'invite)
            // Par défaut, on prend le WORK profile de l'initiateur
            console.log(`[API Connection] Fetching myWorkProfile for userId: ${user.id}`);
            const myWorkProfile = await prisma.profile.findUnique({
                where: { userId_type: { userId: user.id, type: 'WORK' } }
            });

            if (!myWorkProfile) {
                console.error(`[API Connection] Source profile (WORK) not found for user ${user.id}`);
                return NextResponse.json({ success: false, error: 'Profil source non trouvé' }, { status: 404 });
            }
            
            console.log(`[API Connection] Source profile found: ${myWorkProfile.id}`);
            if (myWorkProfile.id === targetId) {
                console.warn("[API Connection] Self connection attempt");
                return NextResponse.json({ success: false, error: 'Self connection not allowed' }, { status: 400 });
            }

            const existing = await prisma.connection.findFirst({
                where: { OR: [{ initiatorId: myWorkProfile.id, receiverId: targetId }, { initiatorId: targetId, receiverId: myWorkProfile.id }] }
            });
            
            if (existing) {
                console.log(`🛡️ [IDEMPOTENCY] Request already exists: ${myWorkProfile.id} <-> ${targetId}. Status: ${existing.status}`);
                return NextResponse.json({ success: true, message: 'Already requested', status: existing.status });
            }

            try {
                console.log(`[API Connection] Creating connection: ${myWorkProfile.id} -> ${targetId}`);
                await prisma.connection.create({ 
                    data: { initiatorId: myWorkProfile.id, receiverId: targetId, status: "PENDING" } 
                });

                if (oppId) {
                    console.log(`[API Connection] Updating opportunity ${oppId} to INVITED`);
                    await prisma.opportunity.update({
                        where: { id: oppId },
                        data: { status: 'INVITED' }
                    });
                }

                console.log("[API Connection] Request successful");
                return NextResponse.json({ success: true });
            } catch (dbError: any) {
                console.error("[API Connection] Database error during creation:", dbError);
                return NextResponse.json({ success: false, error: 'Erreur lors de la création de la connexion' }, { status: 500 });
            }
        }

        if (action === 'accept') {
            const { connectionId, oppId } = body;

            if (oppId) {
                const opp = await prisma.opportunity.findUnique({ 
                    where: { id: oppId },
                    include: { sourceProfile: true, targetProfile: true }
                });
                if (!opp || (opp.sourceProfile.userId !== user.id && opp.targetProfile.userId !== user.id)) return NextResponse.json({ success: false, error: 'Accès refusé ou opportunité introuvable' }, { status: 403 });

                // Check if opportunity is already accepted
                if (opp.status === 'ACCEPTED') {
                    return NextResponse.json({ success: true, message: 'Opportunity already accepted' });
                }

                // Ici opp.sourceId et opp.targetId sont des Profile.id
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
                return NextResponse.json({ success: true, message: 'Already accepted' });
            }

            // Vérifier que le receiverId de la connexion appartient bien à l'utilisateur courant (via un profile)
            const myTargetProfile = await prisma.profile.findFirst({
                where: { id: conn.receiverId, userId: user.id }
            });
            if (!myTargetProfile) return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });

            await prisma.connection.update({
                where: { id: connectionId },
                data: { status: "ACCEPTED" }
            });
            
            return NextResponse.json({ success: true });
        }

        if (action === 'reject') {
            const { connectionId } = body;
            const conn = await prisma.connection.findUnique({ where: { id: connectionId } });
            
            if (!conn) return NextResponse.json({ success: false, error: 'Connexion non trouvée' }, { status: 404 });

            // Vérifier que le receveur est bien l'utilisateur courant
            const myTargetProfile = await prisma.profile.findFirst({
                where: { id: conn.receiverId, userId: user.id }
            });
            if (!myTargetProfile) return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });

            // On passe la connexion en REJECTED
            await prisma.connection.update({
                where: { id: connectionId },
                data: { status: "REJECTED" }
            });
            
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: `Action non reconnue: ${action}` }, { status: 400 });
    } catch (e: any) {
        if (e.message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }
        console.error("Connection POST Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}