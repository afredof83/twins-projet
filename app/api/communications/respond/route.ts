import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
    try {
        const { communicationId, status } = await req.json();

        if (!communicationId || !['ACCEPTED', 'REJECTED'].includes(status)) {
            return NextResponse.json({ error: "Données invalides" }, { status: 400 });
        }

        console.log(`Traitement du message ${communicationId} -> ${status}`);

        // Mise à jour du statut dans Supabase
        const { data, error } = await supabase
            .from('communications')
            .update({ status: status })
            .eq('id', communicationId)
            .select();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: `Statut mis à jour : ${status}`,
            data
        });

    } catch (error: any) {
        console.error("Erreur Respond:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
