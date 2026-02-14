import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

// On garde Mistral pour l'instant car OpenAI n'est pas forcément configuré sur ce projet
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { profileId } = body;

        if (!profileId) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 });

        // 1. Récupération d'un historique large (50 derniers éléments)
        const { data: history } = await supabase
            .from('Memory')
            .select('content, type, createdAt')
            .eq('profileId', profileId) // Suppression du OR pour simplifier et éviter l'erreur si profile_id n'existe pas en type
            .order('createdAt', { ascending: false })
            .limit(50);

        if (!history || history.length < 5) {
            return NextResponse.json({ message: "Pas assez de vécu pour voir l'ombre." });
        }

        const context = history.map(h => `[${h.type}] ${h.content}`).join('\n');

        // 2. LE PROMPT DU MIROIR (Dissonance Cognitive)
        const prompt = `
          Tu es l'Oracle de Frédéric Rey (ID: ${profileId}). Ta mission est d'identifier les "Angles Morts".
          Voici ses souvenirs, actions et intentions récents :
          ---
          ${context}
          ---
          MISSION :
          Trouve une INCOHÉRENCE flagrante ou subtile. 
          Exemple : Il dit vouloir du calme mais accepte des projets stressants. Il parle d'innovation mais reste sur des vieux outils.
          
          CONSIGNES :
          - Ne le juge pas, mais sois d'une honnêteté brutale (Loi I d'Épanouissement).
          - Utilise le "Je" pour parler de ton observation.
          - Termine par une question qui pique sa curiosité.
          
          FORMAT : [MIROIR DE L'OMBRE] : "Observation..."
        `;

        // Appel Mistral (on remplace OpenAI par Mistral Large ou Small selon dispo pour cohérence)
        const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: "mistral-large-latest",
                messages: [
                    { role: "system", content: "Tu es un miroir psychologique de haute précision." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.8 // Un peu plus de "liberté" pour l'intuition
            })
        });

        if (!mistralResponse.ok) {
            throw new Error(`Mistral API Error: ${await mistralResponse.text()}`);
        }

        const mistralData = await mistralResponse.json();
        const shadowReflection = mistralData.choices[0].message.content;

        // 3. Sauvegarde en tant que réflexion spéciale
        await supabase.from('Memory').insert([{
            content: shadowReflection,
            profileId: profileId,
            type: 'reflection',
            source: 'shadow_mirror',
            createdAt: new Date().toISOString()
        }]);

        return NextResponse.json({ shadowReflection });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
