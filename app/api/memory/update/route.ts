import { NextRequest, NextResponse } from 'next/server';
import { embeddingService } from '@/lib/vector/embedding-service';
import { vectorStore } from '@/lib/vector/supabase-pgvector';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, content } = body;

        if (!id || !content) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

        // 1. On recalcule l'intelligence (Embedding) car le sens a changé
        const newEmbedding = await embeddingService.generateEmbedding(content);

        // 2. On met à jour dans Supabase
        const { error } = await supabase
            .from('memories')
            .update({
                content: content,
                embedding: newEmbedding, // Important !
                updatedAt: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("🔥 Update Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
