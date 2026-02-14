import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
    try {
        const { negotiationId } = await req.json();

        // 1. Récupérer les détails de la négociation
        const { data: neg } = await supabase.from('Negotiation').select('*').eq('id', negotiationId).single();

        // 2. Extraire les "Memories" des deux clones
        const { data: mem1 } = await supabase.from('Memory').select('content').eq('profileId', neg.initiatorId);
        const { data: mem2 } = await supabase.from('Memory').select('content').eq('profileId', neg.receiverId);

        const context1 = mem1?.map(m => m.content).join('\n');
        const context2 = mem2?.map(m => m.content).join('\n');

        // 3. Appel à Mistral pour l'audit technique
        const prompt = `
      AUDIT TECHNIQUE FLASH - SYNTHÈSE DÉCISIONNELLE
      ----------------------------------------------
      CLONE A (Propriétaire du Brevet) : ${context1}
      CLONE B (Fabricant Cible) : ${context2}

      TÂCHE : Analyse la compatibilité en 3 sections ultra-concises :
      1. SYNCHRO (Pourquoi ça match ?)
      2. ATOUTS CLÉS (Machines/Matériaux spécifiques)
      3. VIGILANCE (Le point qui peut bloquer)

      STYLE : Direct, télégraphique, pas de phrases de remplissage.
      VERDICT FINAL : Doit se terminer par "COMPATIBILITÉ : [HAUTE/MOYENNE/FAIBLE]"
    `;

        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}` },
            body: JSON.stringify({
                model: "mistral-large-latest",
                messages: [{ role: "system", content: "Tu es un auditeur industriel cybernétique." }, { role: "user", content: prompt }]
            })
        });

        const aiData = await res.json();
        const result = aiData.choices[0].message.content;

        // 4. Sauvegarder le verdict final
        await supabase.from('Negotiation').update({
            status: 'COMPLETED',
            summary: result,
            verdict: result.includes('HAUTE') ? 'COMPATIBILITÉ HAUTE' : 'AUDIT TERMINÉ'
        }).eq('id', negotiationId);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
