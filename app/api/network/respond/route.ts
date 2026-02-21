import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: "Non autorisÃ©" }, { status: 401 });

        const { requestId, requesterId, action } = await req.json();

        // Client utilisateur pour identifier le rÃ©pondant (via RLS)
        const supabaseUser = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user } } = await supabaseUser.auth.getUser();
        if (!user) return NextResponse.json({ error: "Non identifiÃ©" }, { status: 403 });

        // ðŸ›¡ï¸ SÃ‰CURITÃ‰ & DEBUG AVANCÃ‰
        const currentUserId = user?.id ? String(user.id).trim() : "";
        const targetReqId = requesterId ? String(requesterId).trim() : "";

        console.log(`[DEBUG RESPOND] Verif Boucle: Moi('${currentUserId}') vs Requester('${targetReqId}')`);

        if (currentUserId === targetReqId) {
            console.error("[SECURITY BLOCK] ðŸ›‘ BOUCLE TEMPORELLE INTERCEPTÃ‰E !");
            return NextResponse.json({ error: "Boucle temporelle dÃ©tectÃ©e : Vous ne pouvez pas vous lier Ã  vous-mÃªme." }, { status: 400 });
        }

        // Client service role pour les mutations (contourne RLS sur AccessRequest + Channel)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        if (action === 'accept') {
            // 1. CrÃ©er le canal avec les noms de colonnes rÃ©els
            const { error: chanError } = await supabase.from('Channel').insert({
                id: crypto.randomUUID(),
                topic: `Liaison Directe : ${user?.id.slice(0, 4)} x ${requesterId.slice(0, 4)}`,
                member_one_id: user?.id,     // Toi
                member_two_id: requesterId,  // Lui
                initiatorId: requesterId     // Celui qui a fait la demande
            });

            if (chanError) {
                console.error("[ERROR BDD Channel]", chanError);
            } else {
                // 2. Supprimer la requÃªte UNIQUEMENT si le canal est crÃ©Ã©
                await supabase.from('AccessRequest').delete().eq('id', requestId);
                console.log(`[RESPOND] âœ… Liaison acceptÃ©e et requÃªte nettoyÃ©e : ${user?.id} â†” ${requesterId}`);
            }

        } else if (action === 'block') {
            // 1. Inscrire dans BlockList (colonnes camelCase selon le schÃ©ma)
            await supabase.from('BlockList').insert({
                blockerId: user.id,
                blockedId: requesterId,
            });
            // 2. Supprimer la requÃªte
            await supabase.from('AccessRequest').delete().eq('id', requestId);
            console.log(`[RESPOND] ðŸš« EntitÃ© bloquÃ©e : ${requesterId}`);

        } else {
            // Refus simple : on efface la trace
            await supabase.from('AccessRequest').delete().eq('id', requestId);
            console.log(`[RESPOND] âœ• RequÃªte refusÃ©e : ${requestId}`);
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("[CRASH /api/network/respond]:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
