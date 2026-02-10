import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    try {
        const { profileId } = await req.json();

        // Méthode brutale mais efficace : Suppression par requête SQL directe via RPC (ou logique code)
        // Ici, on utilise une logique JS pour être compatible sans modifier le SQL complexe.

        // 1. On récupère TOUS les souvenirs (ID et Content uniquement)
        const { data: allMemories } = await supabase
            .from('Memory')
            .select('id, content')
            .eq('profileId', profileId);

        if (!allMemories || allMemories.length === 0) {
            return NextResponse.json({ message: "Mémoire vide." });
        }

        // 2. Détection des doublons
        const seen = new Set();
        const duplicates: string[] = [];

        for (const mem of allMemories) {
            // On normalise le texte (minuscule, sans espace inutile) pour comparer
            const normalized = mem.content?.trim().toLowerCase();

            if (seen.has(normalized)) {
                duplicates.push(mem.id);
            } else {
                seen.add(normalized);
            }
        }

        // 3. Exécution de la purge
        if (duplicates.length > 0) {
            const { error } = await supabase
                .from('Memory')
                .delete()
                .in('id', duplicates);

            if (error) throw error;

            console.log(`[NETTOYAGE] ${duplicates.length} doublons supprimés.`);
            return NextResponse.json({ success: true, count: duplicates.length });
        }

        return NextResponse.json({ success: true, count: 0, message: "Aucun doublon." });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
