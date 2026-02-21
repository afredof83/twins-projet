import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(req: Request) {
    try {
        const { myProfileId, targetProfileId } = await req.json();

        // 1. RÃ‰CUPÃ‰RATION DES DEUX IDENTITÃ‰S (Leurs bios, leurs buts, leurs mÃ©moires)
        const { data: profiles } = await supabase
            .from('Profile')
            .select('id, name, bio') // 'username' n'est pas dans le schÃ©ma, on utilise 'name'
            .in('id', [myProfileId, targetProfileId]);

        const me = profiles?.find(p => p.id === myProfileId);
        const target = profiles?.find(p => p.id === targetProfileId);

        // Fallback si pas de profil trouvÃ© (simulation ou erreur)
        if (!me || !target) {
            return NextResponse.json({ error: "Profils introuvables" }, { status: 404 });
        }

        // 2. LA NÃ‰GOCIATION (Simulation de dialogue entre Gardiens)
        const negotiation = await mistral.chat.complete({
            model: "mistral-large-latest",
            messages: [
                {
                    role: "system",
                    content: `Tu es le "Gardien NumÃ©rique" de ${me.name}. 
          Tu rencontres le Gardien de ${target.name}. 
          
          BUT : DÃ©terminer si un partenariat entre vos deux humains est stratÃ©gique.
          TON HUMAIN (${me.name}) : ${me.bio}
          L'AUTRE HUMAIN (${target.name}) : ${target.bio}
          
          RÃˆGLES : 
          1. Sois protecteur (ne livre pas tout le brevet).
          2. Cherche la synergie (Fabrication vs Innovation).
          3. Si le match est validÃ©, propose un "Point de Contact" prÃ©cis.
          
          FORMAT JSON ATTENDU : { "summary": "...", "verdict": "MATCH" ou "REJET", "nextStep": "..." }`
                },
                {
                    role: "user",
                    content: "Engage la conversation avec l'autre Gardien. Produis un rÃ©sumÃ© de votre nÃ©gociation et une recommandation finale : MATCH ou REJET."
                }
            ],
            responseFormat: { type: "json_object" }
        });

        const content = negotiation.choices?.[0].message.content;
        const result = typeof content === 'string' ? JSON.parse(content) : content;

        // 3. ENREGISTREMENT DE LA TENTATIVE
        // On doit Ã©tendre le schÃ©ma Prisma pour supporter cela, mais pour l'instant on simule l'enregistrement ou on le logue
        // Si la table Negotiation n'existe pas, on logue juste.
        console.log(`ðŸ¤ [NEGOCIATION] ${me.name} vs ${target.name} -> ${result.verdict}`);

        // Simulation d'enregistrement en base (Ã  dÃ©commenter quand le modÃ¨le Negotiation sera crÃ©Ã©)
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
        console.error("âŒ Erreur Negotiation:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
