import { NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';
import { prisma } from "@/lib/prisma";

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { profileId, newMemoryContent } = body;

        if (!profileId || !newMemoryContent) {
            return NextResponse.json({ error: "ParamÃ¨tres manquants" }, { status: 400 });
        }

        console.log(`ðŸ§  [GARDIEN] RÃ©veil. Analyse de la nouvelle mÃ©moire pour l'Agent ${profileId}...`);

        // 1. RÃ©cupÃ©rer le profil actuel pour avoir le contexte
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: { name: true, unifiedAnalysis: true }
        });

        if (!profile) throw new Error("Profil introuvable");

        // 2. Le Prompt Tactique pour Mistral
        const systemPrompt = `Tu es le Gardien Autonome d'un systÃ¨me de renseignement. 
Ton rÃ´le est de lire une NOUVELLE information sur une cible, et de mettre Ã  jour son profil psychologique/tactique.
Profil actuel de ${profile.name} : ${profile.unifiedAnalysis || "Aucune analyse prÃ©alable."}
Nouvelle information interceptÃ©e : "${newMemoryContent}"

GÃ©nÃ¨re une NOUVELLE synthÃ¨se (max 3 phrases) qui intÃ¨gre cette nouvelle information au profil existant. Sois froid, analytique et prÃ©cis.`;

        // 3. Appel Ã  Mistral AI
        const chatResponse = await mistral.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: systemPrompt }],
        });

        const newAnalysis = chatResponse.choices?.[0]?.message?.content;

        if (!newAnalysis) throw new Error("Mistral n'a pas rÃ©pondu correctement.");

        // 4. Mise Ã  jour de la base de donnÃ©es (Silencieuse)
        await prisma.profile.update({
            where: { id: profileId },
            data: { unifiedAnalysis: newAnalysis }
        });

        console.log(`âœ… [GARDIEN] Analyse mise Ã  jour : ${newAnalysis}`);

        return NextResponse.json({ success: true, newAnalysis });

    } catch (error: any) {
        console.error("âŒ [GARDIEN ERROR]", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
