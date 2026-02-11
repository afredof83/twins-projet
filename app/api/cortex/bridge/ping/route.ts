import { createClient } from '@/lib/supabaseServer';
import { Mistral } from '@mistralai/mistralai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const body = await req.json();
    console.log("📦 DEBUG PING REÇU:", body); // <--- DEBUG LOG

    const { requesterId, providerId, topic } = body;

    if (!providerId) {
        console.error("❌ ERREUR CRITIQUE : providerId (Destinataire) est manquant !");
        return NextResponse.json({ error: "Missing providerId" }, { status: 400 });
    }

    try {
        const supabase = await createClient();
        const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

        // 1. Calculer l'embedding du sujet
        const embeddingResponse = await mistral.embeddings.create({
            model: "mistral-embed",
            inputs: [topic],
        });
        const embedding = embeddingResponse.data[0].embedding;

        // 2. On interroge le Cortex du RECEVEUR (providerId)
        const { data: matches } = await supabase.rpc('match_memories', {
            match_threshold: 0.5,
            match_count: 5,
            query_embedding: embedding,
            p_profile_id: providerId // On cherche DANS le cerveau du destinataire
        });

        const bestMatch = matches && matches.length > 0 ? matches[0] : null;
        // Check if similarity exists on the returned object, otherwise default to 0
        const rawScore = bestMatch ? (bestMatch.similarity || 0) : 0;
        const matchPercentage = Math.round(rawScore * 100);

        console.log(`📊 PING SCORE: ${matchPercentage}% pour le sujet "${topic}"`);

        // 3. Insérer la demande dans la table "AccessRequest"
        const { data, error } = await supabase
            .from('AccessRequest')
            .insert([{
                requester_id: requesterId,
                provider_id: providerId,
                topic: topic,
                match_score: matchPercentage,
                status: 'pending' // En attente de validation
            }])
            .select()
            .single();

        if (error) {
            console.error("❌ Erreur SQL Ping:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: data.id, score: matchPercentage });
    } catch (error: any) {
        console.error("Ping Route Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
