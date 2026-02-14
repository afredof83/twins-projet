import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
    try {
        const { profileId } = await req.json();

        // 0. Récupérer la liste des utilisateurs bloqués par moi
        const { data: blockedIds } = await supabase
            .from('BlockList')
            .select('blockedId')
            .eq('blockerId', profileId);

        const excludedIds = blockedIds?.map(b => b.blockedId) || [];
        excludedIds.push(profileId); // On s'exclut soi-même

        // 1. Localiser un autre clone (qui n'est pas bloqué)
        const { data: target } = await supabase
            .from('Profile')
            .select('id, name')
            .not('id', 'in', `(${excludedIds.join(',')})`)
            .limit(1)
            .maybeSingle();

        if (target) {
            // 2. Vérifier si une négociation existe
            // We check if a negotiation exists between me (initiator) and this target (receiver)
            const { data: existing } = await supabase
                .from('Negotiation')
                .select('id, status, summary, verdict')
                .match({ initiatorId: profileId, receiverId: target.id })
                .maybeSingle();

            if (existing) {
                // --- ACTION : SI L'AUDIT EST TERMINÉ, ON RÉVÈLE LE RAPPORT ---
                if (existing.status === 'COMPLETED') {
                    return NextResponse.json({
                        intervention: {
                            id: existing.id,
                            type: 'report', // Nouveau type pour le frontend
                            title: `VERDICT : ${existing.verdict || 'ANALYSE TERMINÉE'}`,
                            content: existing.summary || "Rapport d'audit technique confidentiel.",
                            targetId: target.id
                        }
                    });
                }

                // Si c'est en cours (ACTIVE) ou archivé, on reste silencieux pour ne pas spammer
                console.log(`[GARDIEN] Audit existant (${existing.status}). Silence.`);
                return NextResponse.json({ intervention: null });
            }

            // 3. Si aucune négociation, on propose le match initial
            return NextResponse.json({
                intervention: {
                    type: 'match',
                    title: "CONNEXION ÉTABLIE",
                    content: `Clone "${target.name}" localisé. Prêt pour l'audit de compatibilité technique.`,
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
