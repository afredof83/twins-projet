import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';

// On initialise Supabase (ça c'est safe)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    let profileId = "";

    try {
        const body = await request.json();
        profileId = body.profileId;

        if (!profileId) throw new Error("Profile ID manquant");

        // --- PHASE 1 : RECUPERATION CONTEXTE ---
        const { data: memories } = await supabase
            .from('Memory')
            .select('content')
            .eq('profileId', profileId)
            .order('createdAt', { ascending: false })
            .limit(10);

        const context = memories?.map(m => m.content).join('\n') || "Rien à signaler.";

        // --- PHASE 2 : GENERATION IA ---
        const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: "mistral-small-latest", // Updated to valid model name if needed, keeping user's choice or safe default
                messages: [
                    { role: "system", content: "Tu es une IA autonome. Analyse tes souvenirs. Réponds UNIQUEMENT en JSON : { \"thought\": \"ta pensée courte\" }" },
                    { role: "user", content: `Souvenirs récents: ${context}` }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!mistralResponse.ok) throw new Error("Mistral ne répond pas");

        const rawData = await mistralResponse.json();
        let content = rawData.choices[0].message.content.replace(/```json|```/g, "").trim();

        let parsedThought;
        try {
            parsedThought = JSON.parse(content);
        } catch (e) {
            // Fallback si le JSON est malformé
            parsedThought = { thought: content };
        }

        // --- PHASE 3 : SAUVEGARDE ---
        await supabase.from('Memory').insert([{
            profileId,
            content: `[REFLEXION] ${parsedThought.thought}`,
            type: 'thought',
            source: 'autonomous_reflection'
        }]);

        // --- PHASE 4 : NOTIFICATION (Build Safe) ---
        // On vérifie les clés AVANT de toucher à webPush
        // Et on le fait DANS la fonction, pas dehors.
        if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
            try {
                // Configuration à la volée
                webPush.setVapidDetails(
                    `mailto:${process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com'}`,
                    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
                    process.env.VAPID_PRIVATE_KEY
                );

                const { data: profile } = await supabase
                    .from('Profile')
                    .select('subscription')
                    .eq('id', profileId)
                    .single();

                if (profile?.subscription) {
                    const sub = typeof profile.subscription === 'string'
                        ? JSON.parse(profile.subscription)
                        : profile.subscription;

                    await webPush.sendNotification(sub, JSON.stringify({
                        title: '🧠 Nouvelle Pensée',
                        body: parsedThought.thought,
                        icon: '/icon-192.png'
                    }));
                }
            } catch (notifError) {
                console.warn("⚠️ Echec Notification (Pas grave):", notifError);
            }
        }

        return NextResponse.json({ success: true, thought: parsedThought });

    } catch (error: any) {
        console.error("❌ CRASH API REFLECT:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
