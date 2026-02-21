import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { communicationId, status } = await req.json();

        if (!communicationId || !['ACCEPTED', 'REJECTED'].includes(status)) {
            return NextResponse.json({ error: "DonnÃ©es invalides" }, { status: 400 });
        }

        console.log(`Traitement du message ${communicationId} -> ${status}`);

        // Mise Ã  jour du statut dans Supabase
        const { data, error } = await supabase
            .from('communications')
            .update({ status: status })
            .eq('id', communicationId)
            .select();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: `Statut mis Ã  jour : ${status}`,
            data
        });

    } catch (error: any) {
        console.error("Erreur Respond:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
