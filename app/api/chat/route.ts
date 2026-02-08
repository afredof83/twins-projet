import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Config
export const runtime = 'edge'; // On tente le mode Edge pour voir si c'est plus stable
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message, profileId } = body;

        // 1. Vérification basique
        if (!message || !profileId) {
            return NextResponse.json({ reply: "ERREUR: Message ou ID manquant." });
        }

        // 2. Sauvegarde User (On ne bloque pas l'exécution pour ça)
        // On utilise fetch direct vers Supabase si le client JS pose problème en Edge, 
        // mais ici on garde le client pour simplifier.
        await supabase.from('Memory').insert([{
            profileId, content: message, type: 'user'
        }]);

        console.log(`[CHAT] Message reçu: ${message.substring(0, 50)}...`);

        // 3. Appel Mistral DIRECT (Sans RAG pour l'instant, pour isoler le bug)
        // Si ça marche ici, c'est que c'était le code RAG (recherche vectorielle) qui plantait.

        if (!MISTRAL_API_KEY) {
            throw new Error("Clé API Mistral manquante dans .env.local");
        }

        const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: "mistral-tiny",
                messages: [
                    { role: "system", content: "Tu es une IA utile et concise. Réponds en une seule phrase." },
                    { role: "user", content: message }
                ]
            })
        });

        const data = await mistralResponse.json();

        // Vérification de la réponse Mistral
        if (!data.choices || data.choices.length === 0) {
            console.error("[MISTRAL ERROR]", data);
            return NextResponse.json({ reply: `ERREUR MISTRAL: ${JSON.stringify(data)}` });
        }

        const reply = data.choices[0].message.content;

        // 4. Sauvegarde IA
        await supabase.from('Memory').insert([{
            profileId, content: reply, type: 'ai'
        }]);

        return NextResponse.json({ reply: reply });

    } catch (error: any) {
        console.error("[CRASH API]", error);
        // C'EST ICI QUE TOUT SE JOUE :
        // On renvoie l'erreur exacte au lieu de "Silence radio"
        return NextResponse.json({
            reply: `🔥 ERREUR CRITIQUE: ${error.message || JSON.stringify(error)}`
        });
    }
}