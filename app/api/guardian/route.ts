import { NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';
import { prisma } from "@/lib/prisma";

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { profileId, newMemoryContent } = body;

        if (!profileId || !newMemoryContent) {
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
        const systemPrompt = `Tu es le Gardien Autonome d'un système de renseignement. 
Ton rôle est de lire une NOUVELLE information sur une cible, et de mettre à jour son profil psychologique/tactique.
Profil actuel de ${profile.name} : ${profile.unifiedAnalysis || "Aucune analyse préalable."}
Nouvelle information interceptée : "${newMemoryContent}"

Génère une NOUVELLE synthèse (max 3 phrases) qui intègre cette nouvelle information au profil existant. Sois froid, analytique et précis.`;

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
        console.error("âŒ [GARDIEN ERROR]", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
