import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
    try {
        const { negotiationId } = await req.json();

        // 1. Récupérer les participants de l'audit
        const { data: neg, error: negError } = await supabase
            .from('Negotiation')
            .select('initiatorId, receiverId')
            .eq('id', negotiationId)
            .single();

        if (negError || !neg) throw new Error("Audit introuvable");

        // 2. Créer le Canal (Liaison officielle)
        // On utilise les colonnes exactes : member_one_id, member_two_id
        const { error: channelError } = await supabase
            .from('Channel')
            .insert([{
                member_one_id: neg.initiatorId,
                member_two_id: neg.receiverId,
                topic: "Liaison Technique Validée",
                last_message_at: new Date().toISOString(),
                initiatorId: neg.initiatorId, // <--- ON ENREGISTRE QUI A LANCÉ L'AUDIT
            }]);

        if (channelError) {
            // Si le canal existe déjà (contrainte unique), on ignore l'erreur
            // Note: Supabase retournera 23505 si une contrainte unique est violée
            if (channelError.code !== '23505') {
                console.warn("Erreur création canal (peut-être déjà existant):", channelError.message);
            } else {
                console.log("Canal déjà existant, continuation...");
            }
        }

        // 3. Archiver l'audit pour nettoyer le Dashboard
        await supabase
            .from('Negotiation')
            .update({ status: 'ARCHIVED' })
            .eq('id', negotiationId);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Erreur Liaison:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
