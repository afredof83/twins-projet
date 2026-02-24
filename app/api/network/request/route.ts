import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
    try {
        const { targetId, senderClassification, initialMessage, fullMessage } = await req.json();
        console.log(`[NETWORK] Tentative d'envoi de requête vers : ${targetId}`);

        if (!targetId) {
            return NextResponse.json({ error: "targetId manquant" }, { status: 400 });
        }

        // Client utilisateur authentifié (utilise les cookies Next.js)
        const supabase = await createClient();

        // Récupération de l'expéditeur via le token (source de vérité)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error("[ERROR] Auth user fail:", authError);
            return NextResponse.json({ error: "Utilisateur non identifié" }, { status: 403 });
        }

        // Colonnes réelles du schéma Prisma : requester_id + provider_id + topic
        const { error: insertError } = await supabase.from('AccessRequest').insert({
            id: crypto.randomUUID(),
            requester_id: user.id,   // Schéma Prisma : requester_id
            provider_id: targetId,   // Schéma Prisma : provider_id
            status: 'pending',
            topic: initialMessage || `Demande de liaison (${senderClassification || 'entité inconnue'})`,
            fullMessage: fullMessage || null,
            created_at: new Date().toISOString(),
        });

        if (insertError) {
            console.error("[ERROR BDD] Détails de l'échec d'insertion:", insertError);
            return NextResponse.json({ error: insertError.message }, { status: 400 });
        }

        console.log(`[SUCCESS] Requête enregistrée : ${user.id} â†’ ${targetId}`);
        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("[CRASH SERVEUR /api/network/request]:", err);
        return NextResponse.json({ error: "Erreur interne du serveur", details: err.message }, { status: 500 });
    }
}
