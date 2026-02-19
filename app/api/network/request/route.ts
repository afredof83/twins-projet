import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            console.error("[ERROR] Authorization header missing");
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { targetId } = await req.json();
        console.log(`[NETWORK] Tentative d'envoi de requête vers : ${targetId}`);

        if (!targetId) {
            return NextResponse.json({ error: "targetId manquant" }, { status: 400 });
        }

        // Client anon pour vérifier l'identité (token utilisateur)
        const supabaseAuth = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader } } }
        );

        // Récupération de l'expéditeur via le token (source de vérité)
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
        if (authError || !user) {
            console.error("[ERROR] Auth user fail:", authError);
            return NextResponse.json({ error: "Utilisateur non identifié" }, { status: 403 });
        }

        // Client service role pour l'insertion (bypass RLS côté serveur)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Colonnes réelles du schéma Prisma : requester_id + provider_id + topic
        const { error: insertError } = await supabase.from('AccessRequest').insert({
            id: crypto.randomUUID(),
            requester_id: user.id,   // Schéma Prisma : requester_id
            provider_id: targetId,   // Schéma Prisma : provider_id
            status: 'pending',
            topic: `Demande de liaison`,
            created_at: new Date().toISOString(),
        });

        if (insertError) {
            console.error("[ERROR BDD] Détails de l'échec d'insertion:", insertError);
            return NextResponse.json({ error: insertError.message }, { status: 400 });
        }

        console.log(`[SUCCESS] Requête enregistrée : ${user.id} → ${targetId}`);
        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("[CRASH SERVEUR /api/network/request]:", err);
        return NextResponse.json({ error: "Erreur interne du serveur", details: err.message }, { status: 500 });
    }
}
