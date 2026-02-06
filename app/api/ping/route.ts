import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
    try {
        const { fromId, toId, reason } = await req.json();

        if (!fromId || !toId) {
            return NextResponse.json({ error: "IDs manquants" }, { status: 400 });
        }

        // On dépose le message dans la boîte du destinataire
        const { data, error } = await supabase
            .from('communications')
            .insert({
                from_clone_id: fromId,
                to_clone_id: toId,
                type: 'PING',
                content: reason || "Demande de contact via Mission",
                status: 'PENDING'
            })
            .select();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: "Signal PING envoyé avec succès. En attente de réponse."
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
