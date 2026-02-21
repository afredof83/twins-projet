import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
    try {
        const { profileId } = await req.json();

        // 0. RÃ©cupÃ©rer la liste des utilisateurs bloquÃ©s par moi
        const { data: blockedIds } = await supabase
            .from('BlockList')
            .select('blockedId')
            .eq('blockerId', profileId);

        const excludedIds = blockedIds?.map(b => b.blockedId) || [];
        excludedIds.push(profileId); // On s'exclut soi-mÃªme

        // 1. Localiser un autre Agent IA (qui n'est pas bloquÃ©)
        const { data: target } = await supabase
            .from('Profile')
            .select('id, name')
            .not('id', 'in', `(${excludedIds.join(',')})`)
            .limit(1)
            .maybeSingle();

        if (target) {
            // 2. VÃ©rifier si une nÃ©gociation existe
            // We check if a negotiation exists between me (initiator) and this target (receiver)
            const { data: existing } = await supabase
                .from('Negotiation')
                .select('id, status, summary, verdict')
                .match({ initiatorId: profileId, receiverId: target.id })
                .maybeSingle();

            if (existing) {
                // --- ACTION : SI L'AUDIT EST TERMINÃ‰, ON RÃ‰VÃˆLE LE RAPPORT ---
                if (existing.status === 'COMPLETED') {
                    return NextResponse.json({
                        intervention: {
                            id: existing.id,
                            type: 'report', // Nouveau type pour le frontend
                            title: `VERDICT : ${existing.verdict || 'ANALYSE TERMINÃ‰E'}`,
                            content: existing.summary || "Rapport d'audit technique confidentiel.",
                            targetId: target.id
                        }
                    });
                }

                // Si c'est en cours (ACTIVE) ou archivÃ©, on reste silencieux pour ne pas spammer
                console.log(`[GARDIEN] Audit existant (${existing.status}). Silence.`);
                return NextResponse.json({ intervention: null });
            }

            // 3. Si aucune nÃ©gociation, on propose le match initial
            return NextResponse.json({
                intervention: {
                    type: 'match',
                    title: "CONNEXION Ã‰TABLIE",
                    content: `Agent IA "${target.name}" localisÃ©. PrÃªt pour l'audit de compatibilitÃ© technique.`,
                    targetId: target.id
                }
            });
        }

        return NextResponse.json({ intervention: null });
    } catch (e) {
        console.error("Guardian Intervene Error:", e);
        return NextResponse.json({ intervention: null }, { status: 500 });
    }
}
