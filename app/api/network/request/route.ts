import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            console.error("[ERROR] Authorization header missing");
            return NextResponse.json({ error: "Non autorisÃ©" }, { status: 401 });
        }

        const { targetId } = await req.json();
        console.log(`[NETWORK] Tentative d'envoi de requÃªte vers : ${targetId}`);

        if (!targetId) {
            return NextResponse.json({ error: "targetId manquant" }, { status: 400 });
        }

        // Client anon pour vÃ©rifier l'identitÃ© (token utilisateur)
        const supabaseAuth = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader } } }
        );

        // RÃ©cupÃ©ration de l'expÃ©diteur via le token (source de vÃ©ritÃ©)
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
        if (authError || !user) {
            console.error("[ERROR] Auth user fail:", authError);
            return NextResponse.json({ error: "Utilisateur non identifiÃ©" }, { status: 403 });
        }

        // Client service role pour l'insertion (bypass RLS cÃ´tÃ© serveur)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Colonnes rÃ©elles du schÃ©ma Prisma : requester_id + provider_id + topic
        const { error: insertError } = await supabase.from('AccessRequest').insert({
            id: crypto.randomUUID(),
            requester_id: user.id,   // SchÃ©ma Prisma : requester_id
            provider_id: targetId,   // SchÃ©ma Prisma : provider_id
            status: 'pending',
            topic: `Demande de liaison`,
            created_at: new Date().toISOString(),
        });

        if (insertError) {
            console.error("[ERROR BDD] DÃ©tails de l'Ã©chec d'insertion:", insertError);
            return NextResponse.json({ error: insertError.message }, { status: 400 });
        }

        console.log(`[SUCCESS] RequÃªte enregistrÃ©e : ${user.id} â†’ ${targetId}`);
        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("[CRASH SERVEUR /api/network/request]:", err);
        return NextResponse.json({ error: "Erreur interne du serveur", details: err.message }, { status: 500 });
    }
}
