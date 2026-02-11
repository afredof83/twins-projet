import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    try {
        const { profileId } = await req.json();
        const now = new Date().toISOString();

        // 1. Suppression des items Expirés (Le Balayeur)
        const { data: expired, error: expireError } = await supabase
            .from('Memory')
            .delete()
            .lt('expires_at', now) // < NOW()
            .eq('profileId', profileId)
            .select('id');

        const expiredCount = expired?.length || 0;
        if (expireError) console.error("Erreur expiration:", expireError);

        // 2. Détection des doublons (Méthode JS pour être safe)
        const { data: allMemories } = await supabase
            .from('Memory')
            .select('id, content')
            .eq('profileId', profileId);

        if (!allMemories || allMemories.length === 0) {
            return NextResponse.json({ message: "Mémoire vide.", expiredCount });
        }

        const seen = new Set();
        const duplicates: string[] = [];

        for (const mem of allMemories) {
            if (!mem.content) continue;
            // On normalise le texte (minuscule, sans espace inutile) pour comparer
            const normalized = mem.content.trim().toLowerCase();

            if (seen.has(normalized)) {
                duplicates.push(mem.id);
            } else {
                seen.add(normalized);
            }
        }

        // 3. Exécution de la purge doublons
        let duplicateCount = 0;
        if (duplicates.length > 0) {
            const { error: dupError } = await supabase
                .from('Memory')
                .delete()
                .in('id', duplicates);

            if (dupError) throw dupError;
            duplicateCount = duplicates.length;
        }

        console.log(`[NETTOYAGE] ${expiredCount} expirés, ${duplicateCount} doublons supprimés.`);

        return NextResponse.json({
            success: true,
            expired: expiredCount,
            duplicates: duplicateCount
        });

    } catch (error: any) {
        console.error("Erreur Clean:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
