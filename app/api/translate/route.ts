import { mistralClient } from "@/lib/mistral";
import { NextResponse } from 'next/server';
const mistral = mistralClient;

export async function POST(req: Request) {
    try {
        const { text, targetCountry } = await req.json();

        if (!text || !targetCountry) {
            return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
        }

        console.log(`🌍 [TRADUCTEUR] Interception du message. Traduction vers : ${targetCountry}...`);

        const prompt = `Tu es un module de traduction militaire temps réel.
Ta mission est de traduire le message suivant dans la langue principale de ce pays : ${targetCountry}.
Règle stricte : Ne renvoie QUE la traduction exacte. Aucun commentaire, aucune explication, pas de guillemets.
Si le message est DÉJÀ dans la langue de ce pays, renvoie-le tel quel.

Message à traduire : "${text}"`;

        const chatResponse = await mistral.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: prompt }],
        });

        let translation = "";
        const rawContent = chatResponse.choices?.[0]?.message?.content;

        if (typeof rawContent === 'string') {
            translation = rawContent.trim();
        } else if (Array.isArray(rawContent)) {
            translation = rawContent.map((chunk: any) => chunk.text || '').join('').trim();
        }

        if (!translation) throw new Error("Échec de la traduction Mistral.");

        return NextResponse.json({ success: true, translation });

    } catch (error: any) {
        console.error("❌ [TRADUCTEUR ERROR]", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
