import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(req: Request) {
    try {
        const { myProfileId, targetProfileId } = await req.json();

        // 1. RÉCUPÉRATION DES DEUX IDENTITÉS (Leurs bios, leurs buts, leurs mémoires)
        const { data: profiles } = await supabase
            .from('Profile')
            .select('id, name, bio') // 'username' n'est pas dans le schéma, on utilise 'name'
            .in('id', [myProfileId, targetProfileId]);

        const me = profiles?.find(p => p.id === myProfileId);
        const target = profiles?.find(p => p.id === targetProfileId);

        // Fallback si pas de profil trouvé (simulation ou erreur)
        if (!me || !target) {
            return NextResponse.json({ error: "Profils introuvables" }, { status: 404 });
        }

        // 2. LA NÉGOCIATION (Simulation de dialogue entre Gardiens)
        const negotiation = await mistral.chat.complete({
            model: "mistral-large-latest",
            messages: [
                {
                    role: "system",
                    content: `Tu es le "Gardien Numérique" de ${me.name}. 
          Tu rencontres le Gardien de ${target.name}. 
          
          BUT : Déterminer si un partenariat entre vos deux humains est stratégique.
          TON HUMAIN (${me.name}) : ${me.bio}
          L'AUTRE HUMAIN (${target.name}) : ${target.bio}
          
          RÈGLES : 
          1. Sois protecteur (ne livre pas tout le brevet).
          2. Cherche la synergie (Fabrication vs Innovation).
          3. Si le match est validé, propose un "Point de Contact" précis.
          
          FORMAT JSON ATTENDU : { "summary": "...", "verdict": "MATCH" ou "REJET", "nextStep": "..." }`
                },
                {
                    role: "user",
                    content: "Engage la conversation avec l'autre Gardien. Produis un résumé de votre négociation et une recommandation finale : MATCH ou REJET."
                }
            ],
            responseFormat: { type: "json_object" }
        });

        const content = negotiation.choices?.[0].message.content;
        const result = typeof content === 'string' ? JSON.parse(content) : content;

        // 3. ENREGISTREMENT DE LA TENTATIVE
        // On doit étendre le schéma Prisma pour supporter cela, mais pour l'instant on simule l'enregistrement ou on le logue
        // Si la table Negotiation n'existe pas, on logue juste.
        console.log(`🤝 [NEGOCIATION] ${me.name} vs ${target.name} -> ${result.verdict}`);

        // Simulation d'enregistrement en base (à décommenter quand le modèle Negotiation sera créé)
        /*
        await supabase.from('Negotiation').insert({
          initiatorId: myProfileId,
          receiverId: targetProfileId,
          summary: result.summary,
          verdict: result.verdict,
          nextStep: result.nextStep
        });
        */

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("❌ Erreur Negotiation:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
