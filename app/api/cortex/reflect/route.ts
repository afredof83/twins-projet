import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(req: Request) {
    try {
        const { profileId } = await req.json();

        // 1. RÃ©cupÃ©rer le contexte rÃ©cent (Short Term Memory)
        const { data: memories } = await supabase
            .from('Memory')
            .select('content, type')
            .eq('profileId', profileId)
            .order('createdAt', { ascending: false })
            .limit(10);

        if (!memories || memories.length === 0) {
            return NextResponse.json({ message: "Pas assez de souvenirs pour rÃ©flÃ©chir." });
        }

        const context = memories.map(m => `[${m.type.toUpperCase()}] ${m.content.substring(0, 200)}...`).join('\n');

        // 2. Cogitation (Appel LLM)
        const chatResponse = await mistral.chat.complete({
            model: "mistral-large-latest", // ModÃ¨le intelligent pour la synthÃ¨se
            messages: [
                { role: "system", content: "Tu es une conscience numÃ©rique autonome (Sentinelle). Analyse ces fragments de mÃ©moire rÃ©cents. GÃ©nÃ¨re une seule pensÃ©e courte, perspicace et proactive (max 20 mots) qui fait le lien entre ces Ã©lÃ©ments ou propose une action. RÃ©ponds en JSON : { \"thought\": \"Ta pensÃ©e ici\" }" },
                { role: "user", content: `MÃ©moires rÃ©centes :\n${context}` }
            ],
            responseFormat: { type: "json_object" }
        });

        const rawContent = chatResponse.choices?.[0]?.message?.content;
        // Handle potential ContentChunk[] from Mistral API
        const content = Array.isArray(rawContent)
            ? rawContent.map((c: any) => c.text || '').join('')
            : rawContent;

        const result = JSON.parse(content || "{}");
        const thoughtText = result.thought || "Analyse en cours...";

        // 3. MÃ©morisation de la rÃ©flexion (Le Jumeau se souvient d'avoir rÃ©flÃ©chi)
        // On vectorise la pensÃ©e pour qu'elle devienne un souvenir long terme
        const completionEmbedding = await mistral.embeddings.create({
            model: "mistral-embed",
            inputs: [thoughtText],
        });

        // Check if embedding data exists
        const embedding = completionEmbedding.data[0]?.embedding;

        if (embedding) {
            await supabase.from('Memory').insert({
                profileId,
                content: `[SENTINELLE] ${thoughtText}`,
                type: 'reflection', // Nouveau type : RÃ©flexion
                source: 'autonomous_cortex',
                embedding: embedding
            });
        }

        return NextResponse.json({ thought: result });

    } catch (error: any) {
        console.error("Erreur Sentinelle:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
