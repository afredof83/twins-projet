import { NextRequest, NextResponse } from 'next/server';
import { vectorStore } from '@/lib/vector/supabase-pgvector';

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "ID manquant" }, { status: 400 });
        }

        await vectorStore.deleteMemory(id);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("🔥 Delete Memory Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
