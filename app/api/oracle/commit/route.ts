import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(req: Request) {
    try {
        const { profileId, prophecy } = await req.json();

        if (!profileId || !prophecy) {
            return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
        }

        console.log(`🔮 [ORACLE] Gravure du destin pour ${profileId}...`);

        // 1. Vectorisation de la prophétie (Pour que le Twin s'en souvienne sémantiquement)
        const embeddingResponse = await mistral.embeddings.create({
            model: "mistral-embed",
            inputs: [prophecy],
        });
        const embedding = embeddingResponse.data[0].embedding;

        // 2. Insertion en base comme "Souvenir Fondamental"
        // On utilise un type spécial 'directive' ou on préfixe le contenu
        const content = `[DESTIN] PROTOCOLE ACTIF : ${prophecy}`;

        const { error } = await supabase.from('Memory').insert([{
            profileId,
            content: content,
            type: 'directive', // Type prioritaire (à ajouter à ton Enum si besoin, sinon 'thought')
            source: 'oracle_prophecy',
            embedding: embedding,
            createdAt: new Date().toISOString()
        }]);

        if (error) throw error;

        return NextResponse.json({ success: true, message: "Destin accepté et mémorisé." });

    } catch (error: any) {
        console.error("❌ Erreur Commit Oracle:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
