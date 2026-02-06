import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "ID manquant" }, { status: 400 });
        }

        // Suppression dans Supabase
        const { error } = await supabase
            .from('memories')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: "Souvenir supprimé du Cortex." });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
