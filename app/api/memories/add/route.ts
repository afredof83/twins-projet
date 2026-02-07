import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration Mistral (Pour les vecteurs)
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { content, type, profileId } = body;

        // 1. Validation de base
        if (!content || !profileId) {
            return NextResponse.json({ error: 'Content and ProfileID required' }, { status: 400 });
        }

        console.log(`[Neuro-Link] Ajout souvenir pour ${profileId} (${type || 'thought'})`);

        // 2. Génération du Vecteur (Embedding)
        let embedding = null;

        if (MISTRAL_API_KEY) {
            try {
                const embeddingResponse = await fetch('https://api.mistral.ai/v1/embeddings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${MISTRAL_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'mistral-embed',
                        input: [content]
                    })
                });

                if (embeddingResponse.ok) {
                    const data = await embeddingResponse.json();
                    embedding = data.data[0].embedding;
                } else {
                    console.error("Erreur Mistral Embedding:", await embeddingResponse.text());
                }
            } catch (e) {
                console.error("Erreur connexion Mistral:", e);
            }
        } else {
            console.warn("⚠️ MISTRAL_API_KEY manquante : Le souvenir ne sera pas vectorisé (recherche IA impossible).");
        }

        // 3. Insertion dans Supabase
        // Note: On utilise "Memory" avec des guillemets pour respecter la casse si nécessaire
        const { data, error } = await supabase
            .from('Memory')
            .insert([
                {
                    profileId: profileId,
                    // On stocke le contenu "crypté" (ici en clair pour le dev) et normal
                    encryptedContent: content,
                    // Si vous avez une colonne content en clair, décommentez la ligne suivante:
                    // content: content, 
                    type: type || 'thought',
                    embedding: embedding, // Peut être null si l'IA échoue, c'est pas grave
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(), // <--- AJOUT OBLIGATOIRE
                    encryptedMetadata: '{}'              // <--- AJOUT OBLIGATOIRE
                }
            ])
            .select();

        if (error) {
            console.error("Erreur Supabase Insert:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, memory: data });

    } catch (error) {
        console.error("Erreur CRITIQUE API Add:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}