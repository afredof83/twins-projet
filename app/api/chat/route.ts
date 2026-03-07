export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPrismaForUser } from '@/lib/prisma';

// Helper for auth via API Route
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
    if (!user) throw new Error("Accès refusé. Token invalide ou manquant.");
    return user;
}

export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        // 1. Parsing strict du payload
        const body = await request.json();
        const { content, receiverId } = body;

        if (!content || !receiverId) {
            return NextResponse.json({ error: "Payload invalide : content ou receiverId manquant" }, { status: 400 });
        }

        // 2. Vérification de l'identité via Supabase Auth
        const user = await getAuthUser(request);

        // 3. ⚡ Instanciation du Prisma avec RLS ⚡
        const prismaRLS = getPrismaForUser(user.id);

        // Vérification d'association si besoin, mais RLS gère les accès de base.
        // On s'assure qu'une connexion ACCEPTED existe.
        const activeConnection = await prismaRLS.connection.findFirst({
            where: {
                OR: [
                    { initiatorId: user.id, receiverId: receiverId },
                    { initiatorId: receiverId, receiverId: user.id }
                ],
                status: 'ACCEPTED'
            }
        });

        if (!activeConnection) {
            return NextResponse.json({ error: "Accès refusé. Aucune connexion active avec cet utilisateur." }, { status: 403 });
        }

        // 4. Exécution de la requête sous contexte utilisateur
        const message = await prismaRLS.message.create({
            data: {
                content,
                senderId: user.id,
                receiverId
            }
        });

        return NextResponse.json({ success: true, message });

    } catch (error: any) {
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

        if (!receiverId || !cursorId) {
            return NextResponse.json({ error: "Paramètres manquants : receiverId ou cursorId" }, { status: 400 });
        }

        const user = await getAuthUser(request);
        const prismaRLS = getPrismaForUser(user.id);

        // Fetch des messages plus anciens via pagination sur RLS
        const olderMessages = await prismaRLS.message.findMany({
            where: {
                OR: [
                    { senderId: user.id, receiverId: receiverId },
                    { senderId: receiverId, receiverId: user.id }
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

        const user = await getAuthUser(request);
        const prismaRLS = getPrismaForUser(user.id);

        // Vérifier que la connexion existe et appartient à l'utilisateur
        const connection = await prismaRLS.connection.findFirst({
            where: {
                id: connectionId,
                OR: [
                    { initiatorId: user.id },
                    { receiverId: user.id }
                ]
            }
        });

        if (!connection) {
            return NextResponse.json({ success: false, error: "Connexion introuvable ou accès refusé." }, { status: 404 });
        }

        // Supprimer les messages associés puis la connexion
        await prismaRLS.message.deleteMany({
            where: {
                OR: [
                    { senderId: connection.initiatorId, receiverId: connection.receiverId },
                    { senderId: connection.receiverId, receiverId: connection.initiatorId }
                ]
            }
        });

        await prismaRLS.connection.delete({ where: { id: connectionId } });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Erreur API Chat (DELETE):", error);
        return NextResponse.json({ success: false, error: error.message || "Erreur critique du serveur" }, { status: 500 });
    }
}
