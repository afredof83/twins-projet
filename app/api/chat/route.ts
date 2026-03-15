export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClientServer } from '@/lib/supabaseScoped';

export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        // 1. Parsing strict du payload
        const body = await request.json();
        const { content, receiverId, action } = body;

        // 2. Vérification de l'identité via Supabase Auth
        const { user } = await createClientServer(request);
        const { senderId } = body; // Le profil décliné (WORK/HOBBY/DATING)



        if (action === 'read' && receiverId) {
            // Ici receiverId est le partenaire, on doit aussi filtrer par notre profil actif (senderId)
            await prisma.message.updateMany({
                where: {
                    senderId: receiverId,
                    receiverId: senderId || user.id, // Fallback vers user.id pour compatibilité
                    isRead: false
                },
                data: { isRead: true }
            });
            return NextResponse.json({ success: true });
        }

        if (!content || !receiverId) {
            return NextResponse.json({ error: "Payload invalide : content ou receiverId manquant" }, { status: 400 });
        }

        // 3. ⚡ Instanciation du Prisma ⚡
        // On vérifie que le senderId appartient bien à l'utilisateur si fourni
        if (senderId) {
            const profile = await prisma.profile.findFirst({
                where: { id: senderId, userId: user.id }
            });
            if (!profile) return NextResponse.json({ error: "Profil invalide ou non autorisé" }, { status: 403 });
        }

        // 4. Exécution de la requête sous contexte utilisateur
        const message = await prisma.message.create({
            data: {
                content,
                senderId: senderId || user.id,
                receiverId
            }
        });

        return NextResponse.json({ success: true, message });

    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: "Accès refusé. Token invalide ou manquant." }, { status: 401 });
        }
        console.error("Erreur API Chat (POST):", error);
        return NextResponse.json({ error: error.message || "Erreur critique du serveur" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { searchParams } = new URL(request.url);
        const receiverId = searchParams.get('receiverId');
        const cursorId = searchParams.get('cursorId');
        const senderId = searchParams.get('senderId'); // Notre identité prism

        if (!receiverId || !cursorId) {
            return NextResponse.json({ error: "Paramètres manquants : receiverId ou cursorId" }, { status: 400 });
        }

        const { user } = await createClientServer(request);


        // Fetch des messages plus anciens via pagination
        const myId = senderId || user.id;
        
        // Sécurité si senderId est fourni
        if (senderId) {
            const profile = await prisma.profile.findFirst({ where: { id: senderId, userId: user.id } });
            if (!profile) return NextResponse.json({ error: "Profil source non autorisé" }, { status: 403 });
        }

        const olderMessages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: myId, receiverId: receiverId },
                    { senderId: receiverId, receiverId: myId }
                ]
            },
            take: 50,
            skip: 1, // Skip cursor
            cursor: { id: cursorId },
            orderBy: { createdAt: 'desc' } // Fetch backwards
        });

        // Remettre dans l'ordre chronologique logique (plus vieux en haut)
        return NextResponse.json({ success: true, messages: olderMessages.reverse() });

    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: "Accès refusé. Token invalide ou manquant." }, { status: 401 });
        }
        console.error("Erreur API Chat (GET):", error);
        return NextResponse.json({ error: error.message || "Erreur critique du serveur" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const body = await request.json();
        const { connectionId } = body;

        if (!connectionId) {
            return NextResponse.json({ success: false, error: "connectionId manquant" }, { status: 400 });
        }

        const { user } = await createClientServer(request);


        // Vérifier que la connexion existe et appartient à l'utilisateur
        const connection = await prisma.connection.findFirst({
            where: {
                id: connectionId,
                OR: [
                    { initiator: { userId: user.id } },
                    { receiver: { userId: user.id } }
                ]
            }
        });

        if (!connection) {
            return NextResponse.json({ success: false, error: "Connexion introuvable ou accès refusé." }, { status: 404 });
        }

        // Supprimer les messages associés puis la connexion
        await prisma.message.deleteMany({
            where: {
                OR: [
                    { senderId: connection.initiatorId, receiverId: connection.receiverId },
                    { senderId: connection.receiverId, receiverId: connection.initiatorId }
                ]
            }
        });

        await prisma.connection.delete({ where: { id: connectionId } });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: "Accès refusé. Token invalide ou manquant." }, { status: 401 });
        }
        console.error("Erreur API Chat:", error);
        return NextResponse.json({ error: error.message || "Erreur critique du serveur" }, { status: 500 });
    }
}
