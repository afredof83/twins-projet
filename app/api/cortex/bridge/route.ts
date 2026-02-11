import { createClient } from '@/lib/supabaseServer';
import { Mistral } from '@mistralai/mistralai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { fromProfileId, toProfileId, task } = await req.json();
        const supabase = await createClient();
        const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

        // Generate embedding for the task description
        const embeddingResponse = await mistral.embeddings.create({
            model: "mistral-embed",
            inputs: [task],
        });
        const queryEmbedding = embeddingResponse.data[0].embedding;

        // 1. Recherche profonde dans le Cortex de l'AUTRE clone
        const { data: foreignMemories, error } = await supabase.rpc('match_memories', {
            match_profile_id: toProfileId,
            match_count: 1, // Limit to most relevant
            match_threshold: 0.6, // Higher threshold for relevance
            query_embedding: queryEmbedding
        });

        if (error) {
            console.error("Bridge search error:", error);
            return NextResponse.json({ error: "Bridge connection failed" }, { status: 500 });
        }

        // 2. SÉCURITÉ : On ne renvoie PAS le contenu, juste le signal d'existence
        if (foreignMemories && foreignMemories.length > 0) {
            const bestMatch = foreignMemories[0];
            const similarity = bestMatch.similarity || 0;
            const percentage = Math.round(similarity * 100);

            // SIMULATION PING : Si le match est fort, on prévient le Provider
            if (percentage > 70) {
                console.log(`📡 PING SENT to Provider ${toProfileId} for topic "${task}" (Match: ${percentage}%)`);
                // TODO: Appeler ici /api/cortex/bridge/ping REELLEMENT
            }

            return NextResponse.json({
                found: true,
                topic: task,
                match_score: percentage,
                origin: "EXTERNAL_NETWORK"
            });
        }

        return NextResponse.json({ found: false });

    } catch (error: any) {
        console.error("Bridge Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
