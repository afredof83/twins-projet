
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const json = await request.json();
        const { fromId, toId } = json;

        // Validation des données
        if (!fromId || !toId) {
            return NextResponse.json({ error: 'Missing fromId or toId' }, { status: 400 });
        }

        // On marque tous les messages de cet expéditeur comme "Lus"
        // Note: On update la table 'Message'
        const { error } = await supabase
            .from('Message')
            .update({ isRead: true })
            .eq('fromId', fromId)
            .eq('toId', toId);

        if (error) {
            console.error('Supabase update error:', error);
            throw error;
        };

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Error in mark read:', e);
        return NextResponse.json({ error: 'Erreur update' }, { status: 500 });
    }
}
