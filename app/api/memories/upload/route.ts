import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const profileId = formData.get('profileId') as string;

        if (!file || !profileId) {
            return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
        }

        // Lecture du fichier texte simple
        const text = await file.text();

        if (!text || text.length < 5) {
            return NextResponse.json({ error: 'Fichier vide' }, { status: 400 });
        }

        // Sauvegarde
        const { error } = await supabase
            .from('Memory')
            .insert([{
                profileId,
                content: text,
                type: 'document'
            }]);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}