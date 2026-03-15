export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';
import { trackAgentActivity } from '@/app/actions/missions';
import { createClientServer } from '@/lib/supabaseScoped';

async function vectorizeAndStoreMemory(memoryId: string, content: string) {
    try {
        const embeddingsResponse = await mistralClient.embeddings.create({
            model: 'mistral-embed',
            inputs: [content],
        });
        const embeddingVector = embeddingsResponse.data[0].embedding;
        await prisma.$executeRaw`
            UPDATE memories SET embedding = ${embeddingVector}::vector WHERE id = ${memoryId}
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
        const currentPrism = searchParams.get('currentPrism') || 'WORK';
        
        // 1. Authentification & Extraction JWT
        const { user } = await createClientServer(request);

        // 2. Déduction automatique du profil cible
        const profile = await prisma.profile.findFirst({
            where: { userId: user.id, type: currentPrism }
        });

        if (!profile) {
            return NextResponse.json({ success: false, error: 'Profil introuvable pour ce prisme.' }, { status: 404 });
        }

        // 3. Récupération des mémoires sécurisées
        const memories = await prisma.memory.findMany({
            where: { 
                profileId: profile.id, // On utilise l'ID certifié par la DB
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        return NextResponse.json({ success: true, memories });
    } catch (e: any) {
        if (e.message === 'Unauthorized') {
             return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

// POST /api/memories
export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { user } = await createClientServer(request);
        const contentType = request.headers.get('content-type') || '';

        // FILE UPLOAD (FormData)
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file') as File;
            const textContext = formData.get('textContext') as string;
            const fileName = formData.get('fileName') as string;
            const hasFile = formData.get('hasFile') === 'true';
            const currentPrism = formData.get('currentPrism') as string;
            const profile = await prisma.profile.findUnique({
                where: { userId_type: { userId: user.id, type: currentPrism || 'WORK' } }
            });

            if (!profile) return NextResponse.json({ success: false, error: 'Profil introuvable' }, { status: 404 });

            if (textContext) {
                const cleanContent = textContext.replace(/\0/g, '');
                if (!cleanContent) return NextResponse.json({ success: false, error: 'Aucun contenu valide.' }, { status: 400 });

                const memory = await prisma.memory.create({
                    data: {
                        profileId: profile.id,
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
                data: { profileId: profile.id, content: memoryContent, type: 'document', source: file.name }
            });
            await vectorizeAndStoreMemory(memory.id, memoryContent);
            return NextResponse.json({ success: true, memory });
        }

        // JSON actions
        const body = await request.json();
        const { action } = body;

        if (action === 'addMemory') {
            const { currentPrism, content, type = 'thought', source = 'manual' } = body;
            const profile = await prisma.profile.findUnique({
                where: { userId_type: { userId: user.id, type: currentPrism || 'WORK' } }
            });
            if (!profile) return NextResponse.json({ success: false, error: 'Profil introuvable' }, { status: 404 });

            const memory = await prisma.memory.create({
                data: { profileId: profile.id, content, type, source }
            });
            await vectorizeAndStoreMemory(memory.id, content);
            return NextResponse.json({ success: true, memory });
        }

        if (action === 'scrapeUrl') {
            const { url, currentPrism } = body;
            if (!url) return NextResponse.json({ success: false, error: 'URL manquante' }, { status: 400 });

            const profile = await prisma.profile.findUnique({
                where: { userId_type: { userId: user.id, type: currentPrism || 'WORK' } }
            });
            if (!profile) return NextResponse.json({ success: false, error: 'Profil introuvable' }, { status: 404 });

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
                data: { profileId: profile.id, content: memoryContent, type: 'scraped', source: url }
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
        const { user } = await createClientServer(request);
        const body = await request.json();
        const { memoryId, newContent } = body;

        if (!memoryId || !newContent) return NextResponse.json({ success: false, error: 'Params manquants' }, { status: 400 });

        const embedResponse = await mistralClient.embeddings.create({
            model: 'mistral-embed',
            inputs: [newContent]
        });
        const newVector = embedResponse.data[0].embedding;

        // Vérifier l'appartenance avant mise à jour
        const memory = await prisma.memory.findFirst({
            where: { id: memoryId, profile: { userId: user.id } }
        });
        if (!memory) return NextResponse.json({ success: false, error: 'Mémoire introuvable ou non autorisée' }, { status: 404 });

        await prisma.$executeRaw`
            UPDATE memories SET content = ${newContent}, embedding = ${newVector}::vector WHERE id = ${memoryId}
        `;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { user } = await createClientServer(request);
        const body = await request.json();
        
        // 🛡️ Logique d'extraction multi-niveaux (Bulletproof)
        // Cherche 'id' ou 'memoryId' à la racine OU dans 'payload'
        const id = body.id || 
                   body.memoryId || 
                   body.payload?.id || 
                   body.payload?.memoryId;

        if (!id) {
            console.error("❌ [DELETE] ID introuvable dans le body reçu:", JSON.stringify(body, null, 2));
            return NextResponse.json({ success: false, error: "ID de mémoire manquant" }, { status: 400 });
        }

        const result = await (prisma.memory as any).deleteMany({
            where: { 
                id: id,
                userId: user.id 
            }
        });

        if (result.count === 0) {
            return NextResponse.json({ success: false, error: "Non autorisé ou déjà supprimé" }, { status: 403 });
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("🔥 [DELETE ERROR]:", e.message);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}