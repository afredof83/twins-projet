import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message, profileId } = body;

        // Log pour débugger
        console.log(`[Chat] Question reçue de ${profileId}: "${message?.substring(0, 20)}..."`);

        if (!message || !profileId) {
            console.error("[Chat] Erreur: Message ou ProfileId manquant");
            return NextResponse.json({ error: 'Données invalides reçues' }, { status: 400 });
        }

        if (!MISTRAL_API_KEY) {
            return NextResponse.json({
                response: "Système : Clé API Mistral manquante. Je ne peux pas réfléchir."
            });
        }

        // 1. Vectoriser la question
        const embeddingResponse = await fetch('https://api.mistral.ai/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: 'mistral-embed',
                input: [message]
            })
        });

        if (!embeddingResponse.ok) {
            throw new Error("Echec vectorisation question");
        }

        const embeddingData = await embeddingResponse.json();
        const queryVector = embeddingData.data[0].embedding;

        // 2. Recherche de souvenirs similaires (RAG)
        const { data: similarMemories, error: matchError } = await supabase
            .rpc('match_memories', {
                query_embedding: queryVector,
                query_profile_id: profileId,
                match_threshold: 0.5, // Seuil de similarité
                match_count: 5
            });

        if (matchError) {
            console.error("Erreur recherche vectorielle:", matchError);
            // On continue sans mémoire si la recherche plante (fallback)
        }

        // Préparation du contexte
        const context = similarMemories
            ? similarMemories.map((m: any) => m.encrypted_content || m.content).join("\n---\n")
            : "Aucun souvenir précis.";

        console.log(`[Chat] ${similarMemories?.length || 0} souvenirs trouvés pour le contexte.`);

        // 3. Génération de la réponse
        const chatResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: "mistral-tiny",
                messages: [
                    { role: "system", content: `Tu es un jumeau numérique. Utilise ces souvenirs pour répondre : \n${context}` },
                    { role: "user", content: message }
                ]
            })
        });

        const chatData = await chatResponse.json();
        const reply = chatData.choices?.[0]?.message?.content || "Je n'ai pas pu formuler de réponse.";

        return NextResponse.json({ response: reply });

    } catch (error) {
        console.error("Erreur API Chat:", error);
        return NextResponse.json({
            response: "Erreur critique du système neuronal. Veuillez vérifier les logs serveur."
        });
    }
}