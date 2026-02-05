import { NextRequest, NextResponse } from 'next/server';
import { embeddingService } from '@/lib/vector/embedding-service';
import { vectorStore } from '@/lib/vector/supabase-pgvector';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { content, profileId } = body;

        if (!content || !profileId) {
            return NextResponse.json({ error: "Contenu vide" }, { status: 400 });
        }

        // 1. Vectorisation
        const embedding = await embeddingService.generateEmbedding(content);

        // 2. Sauvegarde dans la mémoire
        await vectorStore.addMemory({
            content: content,
            embedding: embedding,
            tags: ['journal', 'direct_entry'], // On marque que c'est une entrée directe
            type: 'MEMORY',
            profileId: profileId
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("🔥 Add Memory Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
