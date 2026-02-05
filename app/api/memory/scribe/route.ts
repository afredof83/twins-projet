import { NextRequest, NextResponse } from 'next/server';
import { vectorStore } from '@/lib/vector/supabase-pgvector';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { encryptedContent, profileId } = body;

        if (!encryptedContent || !profileId) return NextResponse.json({ error: "Vide" }, { status: 400 });

        // NOTE : On ne génère PAS d'embedding (vector: []) car le contenu est illisible pour l'IA.
        // L'IA ne pourra jamais trouver ce souvenir par recherche sémantique.
        await vectorStore.addMemory({
            content: encryptedContent, // C'est du charabia ici
            embedding: [], // Vecteur vide
            tags: ['scribe', 'secret', 'encrypted'],
            type: 'secret', // Type spécial
            profileId: profileId
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
