import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
    try {
        const { content, type, profileId } = await req.json();

        if (!content || !profileId) {
            return NextResponse.json({ error: "Contenu vide" }, { status: 400 });
        }

        // Insertion simple dans la table 'memories'
        const { data, error } = await supabase
            .from('memories')
            .insert({
                content: content,
                metadata: { type: type || 'PUBLIC' }, // 'PUBLIC' ou 'PRIVATE'
                profileId: profileId
            })
            .select();

        if (error) throw error;

        return NextResponse.json({ success: true, memory: data[0] });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
