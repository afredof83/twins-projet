import { mistralClient } from "@/lib/mistral";
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

const mistral = mistralClient;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { newMemoryContent } = body;

        // 1. Authentifier l'utilisateur
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; }
                }
            }
        );

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const profileId = user.id;

        if (!newMemoryContent) {
            return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
        }

        console.log(`🧠 [GARDIEN] Réveil. Analyse de la nouvelle mémoire pour l'Agent ${profileId}...`);

        // 1. Récupérer le profil actuel pour avoir le contexte
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: { name: true, unifiedAnalysis: true }
        });

        if (!profile) throw new Error("Profil introuvable");

        // 2. Le Prompt Tactique pour Mistral
        const systemPrompt = `Tu es le Cortex, l'IA d'analyse d'un Jumeau Numérique personnel. 
Ton rôle est de lire de nouvelles informations (documents, notes, liens) fournies par l'utilisateur pour mettre à jour son profil professionnel, psychologique et ses valeurs (Ikigai).
Profil actuel de ${profile.name} : ${profile.unifiedAnalysis || "Aucune analyse préalable."}
Nouvelle information ajoutée : "${newMemoryContent}"

Génère une NOUVELLE synthèse (max 3 phrases) qui intègre cette information au profil de manière réaliste et pertinente. 
RÈGLE ABSOLUE : Si la nouvelle information est un simple mot de salutation ("bonjour"), un test, ou un message vide, conserve la synthèse précédente sans la modifier.`;

        // 3. Appel à Mistral AI
        const chatResponse = await mistral.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: systemPrompt }],
        });

        let newAnalysis = "";
        const rawContent = chatResponse.choices?.[0]?.message?.content;

        if (typeof rawContent === 'string') {
            newAnalysis = rawContent;
        } else if (Array.isArray(rawContent)) {
            newAnalysis = rawContent.map((chunk: any) => chunk.text || '').join('');
        }

        if (!newAnalysis) throw new Error("Mistral n'a pas répondu correctement.");

        // 4. Mise à jour de la base de données (Silencieuse)
        await prisma.profile.update({
            where: { id: profileId },
            data: { unifiedAnalysis: newAnalysis }
        });

        console.log(`✅ [GARDIEN] Analyse mise à jour : ${newAnalysis}`);

        return NextResponse.json({ success: true, newAnalysis });

    } catch (error: any) {
        console.error("❌ [GARDIEN ERROR]", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
