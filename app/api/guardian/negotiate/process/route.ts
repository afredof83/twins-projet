import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
    try {
        const { negotiationId } = await req.json();

        // 1. RÃ©cupÃ©rer les dÃ©tails de la nÃ©gociation
        const { data: neg } = await supabase.from('Negotiation').select('*').eq('id', negotiationId).single();

        // 2. Extraire les "Memories" des deux Agent IAs
        const { data: mem1 } = await supabase.from('Memory').select('content').eq('profileId', neg.initiatorId);
        const { data: mem2 } = await supabase.from('Memory').select('content').eq('profileId', neg.receiverId);

        const context1 = mem1?.map(m => m.content).join('\n');
        const context2 = mem2?.map(m => m.content).join('\n');

        // 3. Appel Ã  Mistral pour l'audit technique
        const prompt = `
      AUDIT TECHNIQUE FLASH - SYNTHÃˆSE DÃ‰CISIONNELLE
      ----------------------------------------------
      Agent IA A (PropriÃ©taire du Brevet) : ${context1}
      Agent IA B (Fabricant Cible) : ${context2}

      TÃ‚CHE : Analyse la compatibilitÃ© en 3 sections ultra-concises :
      1. SYNCHRO (Pourquoi Ã§a match ?)
      2. ATOUTS CLÃ‰S (Machines/MatÃ©riaux spÃ©cifiques)
      3. VIGILANCE (Le point qui peut bloquer)

      STYLE : Direct, tÃ©lÃ©graphique, pas de phrases de remplissage.
      VERDICT FINAL : Doit se terminer par "COMPATIBILITÃ‰ : [HAUTE/MOYENNE/FAIBLE]"
    `;

        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}` },
            body: JSON.stringify({
                model: "mistral-large-latest",
                messages: [{ role: "system", content: "Tu es un auditeur industriel cybernÃ©tique." }, { role: "user", content: prompt }]
            })
        });

        const aiData = await res.json();
        const result = aiData.choices[0].message.content;

        // 4. Sauvegarder le verdict final
        await supabase.from('Negotiation').update({
            status: 'COMPLETED',
            summary: result,
            verdict: result.includes('HAUTE') ? 'COMPATIBILITÃ‰ HAUTE' : 'AUDIT TERMINÃ‰'
        }).eq('id', negotiationId);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
