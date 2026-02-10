import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(req: Request) {
    try {
        const { message, profileId } = await req.json();

        // 1. Vectorisation (Embedding)
        const embeddingResponse = await mistral.embeddings.create({
            model: "mistral-embed",
            inputs: [message],
        });
        const embedding = embeddingResponse.data[0].embedding;

        // 2. Recherche Mémoire (RAG)
        const { data: memories } = await supabase.rpc('match_memories', {
            query_embedding: embedding,
            match_threshold: 0.7,
            match_count: 5,
            match_profile_id: profileId
        });

        const context = memories?.map((m: any) => m.content).join('\n') || "Aucun souvenir pertinent.";

        // 3. Génération Réponse
        const chatResponse = await mistral.chat.complete({
            model: "mistral-small-latest",
            messages: [
                { role: "system", content: `Tu es le Jumeau Numérique. Utilise ces souvenirs pour répondre : ${context}` },
                { role: "user", content: message }
            ]
        });

        return NextResponse.json({ reply: chatResponse.choices?.[0]?.message?.content });

    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ reply: "Erreur système. Le cortex ne répond pas." });
    }
}
