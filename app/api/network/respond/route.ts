import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
    try {
        const { requestId, requesterId, action } = await req.json();

        // Client utilisateur authentifié (utilise les cookies Next.js)
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Non identifié" }, { status: 403 });

        // 🛡️ SÉCURITÉ & DEBUG AVANCÉ
        const currentUserId = user?.id ? String(user.id).trim() : "";
        const targetReqId = requesterId ? String(requesterId).trim() : "";

        console.log(`[DEBUG RESPOND] Verif Boucle: Moi('${currentUserId}') vs Requester('${targetReqId}')`);

        if (currentUserId === targetReqId) {
            console.error("[SECURITY BLOCK] 🛑 BOUCLE TEMPORELLE INTERCEPTÉE !");
            return NextResponse.json({ error: "Boucle temporelle détectée : Vous ne pouvez pas vous lier à vous-même." }, { status: 400 });
        }

        if (action === 'accept') {
            // 0. Récupérer la requête pour lire l'ogive (fullMessage) avant suppression
            const { data: requestData } = await supabase.from('AccessRequest').select('fullMessage').eq('id', requestId).single();
            const fullMessage = requestData?.fullMessage;

            const channelId = crypto.randomUUID();

            // 1. Créer le canal avec les noms de colonnes réels
            const { error: chanError } = await supabase.from('Channel').insert({
                id: channelId,
                topic: `Liaison Directe : ${user?.id.slice(0, 4)} x ${requesterId.slice(0, 4)}`,
                member_one_id: user?.id,     // Toi
                member_two_id: requesterId,  // Lui
                initiatorId: requesterId     // Celui qui a fait la demande
            });

            if (chanError) {
                console.error("[ERROR BDD Channel]", chanError);
            } else {
                // 1.5 Libérer l'ogive (Créer le premier message tactique)
                if (fullMessage) {
                    await supabase.from('Message').insert({
                        id: crypto.randomUUID(),
                        content: fullMessage,
                        sender_id: requesterId, // L'initiateur de la requête est l'auteur du message
                        communication_id: channelId
                    });
                    console.log(`[RESPOND] 🎯 Icebreaker déployé dans le canal !`);
                }
                // 2. Supprimer la requête UNIQUEMENT si le canal est créé
                const { error: delError } = await supabase.from('AccessRequest').delete().eq('id', requestId);

                if (delError) {
                    console.error("[ERROR BDD AccessRequest]", delError);
                    return NextResponse.json({ error: "Action réussie mais impossible de nettoyer la notification." }, { status: 500 });
                }
                console.log(`[RESPOND] ✅ Liaison acceptée et requête nettoyée : ${user?.id} â†” ${requesterId}`);
            }

        } else if (action === 'block') {
            // 1. Inscrire dans BlockList (colonnes camelCase selon le schéma)
            await supabase.from('BlockList').insert({
                blockerId: user.id,
                blockedId: requesterId,
            });
            // 2. Supprimer la requête
            const { error: delError } = await supabase.from('AccessRequest').delete().eq('id', requestId);

            if (delError) {
                console.error("[ERROR BDD AccessRequest]", delError);
                return NextResponse.json({ error: "Action réussie mais impossible de nettoyer la notification." }, { status: 500 });
            }
            console.log(`[RESPOND] 🚫 Entité bloquée : ${requesterId}`);

        } else {
            // Refus simple : on efface la trace
            const { error: delError } = await supabase.from('AccessRequest').delete().eq('id', requestId);

            if (delError) {
                console.error("[ERROR BDD AccessRequest]", delError);
                return NextResponse.json({ error: "Action réussie mais impossible de nettoyer la notification." }, { status: 500 });
            }
            console.log(`[RESPOND] ❌ Requête refusée : ${requestId}`);
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("[CRASH /api/network/respond]:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
