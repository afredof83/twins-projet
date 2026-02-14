import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url); // Fix: Added missing const declaration
    const myId = searchParams.get('myId');
    const contactId = searchParams.get('contactId');

    // Si c'est le contact fantôme, on simule une conversation
    if (contactId === 'GHOST_AI_SYSTEM') {
        return NextResponse.json({
            messages: [
                { fromId: 'GHOST_AI_SYSTEM', content: "Bienvenue sur le réseau Twins, Major.", createdAt: new Date(Date.now() - 1000000).toISOString() },
                { fromId: 'GHOST_AI_SYSTEM', content: "Vos systèmes de mémoire sont actifs. En attente de données.", createdAt: new Date().toISOString() }
            ]
        });
    }

    // Sinon, vraie requête DB (Table 'messages' à créer si besoin)
    /*
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .or(`and(fromId.eq.${myId},toId.eq.${contactId}),and(fromId.eq.${contactId},toId.eq.${myId})`)
      .order('createdAt', { ascending: true });
    */

    // Pour l'instant, on renvoie vide pour éviter le crash si la table Message n'existe pas encore
    return NextResponse.json({ messages: [] });
}
