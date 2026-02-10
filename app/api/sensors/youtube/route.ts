import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMistralEmbedding } from '@/lib/mistral';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        // On reçoit maintenant le texte DÉJÀ extrait par le client
        const { videoUrl, transcriptText, title, profileId } = await request.json();

        if (!videoUrl || !transcriptText || !profileId) {
            return NextResponse.json({ error: "Données manquantes (URL, Texte ou ProfileID)" }, { status: 400 });
        }

        // On limite le texte pour Mistral (max ~20k chars pour être safe)
        const truncatedText = transcriptText.substring(0, 20000);

        // 2. Analyse par Mistral (Résumé intelligent)
        const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: "mistral-small",
                messages: [
                    { role: "system", content: "Tu es un assistant cybernétique. Analyse cette transcription vidéo. Donne : 1) Un titre court de sujet. 2) Trois points clés. 3) Une conclusion. Sois concis." },
                    { role: "user", content: `Titre Vidéo: ${title}\n\nTranscription: ${truncatedText}` }
                ]
            })
        });

        if (!mistralResponse.ok) {
            const errText = await mistralResponse.text();
            throw new Error(`Erreur Mistral: ${errText}`);
        }

        const mistralData = await mistralResponse.json();
        const summary = mistralData.choices[0].message.content;

        // 3. Vectorisation du résumé
        const embedding = await getMistralEmbedding(summary);

        // 4. Sauvegarde dans la mémoire
        const { data, error } = await supabase.from('Memory').insert([{
            profileId,
            content: `[VISION] ${title || videoUrl}\n\n${summary}`,
            type: 'knowledge',
            source: 'youtube',
            embedding: embedding
        }]).select();

        if (error) throw error;

        return NextResponse.json({ success: true, summary });

    } catch (error: any) {
        console.error("Erreur YouTube API:", error);
        return NextResponse.json({ error: error.message || "Erreur d'analyse API" }, { status: 500 });
    }
}