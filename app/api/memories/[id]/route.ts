import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const supabase = await createClient();

        console.log(`🗑️ Suppression mémoire ${id}`);

        const { error } = await supabase
            .from('Memory')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Erreur suppression:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
