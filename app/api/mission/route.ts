import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// FONCTION DE NETTOYAGE (Accents + Ponctuation)
const normalizeText = (str: string) => {
    return str
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
}

export async function POST(request: Request) {
    try {
        const { mission, profileId } = await request.json();

        if (!mission || !profileId) {
            return NextResponse.json({ candidates: [], message: "Mission vide." });
        }

        // 1. ANALYSE DE LA MISSION
        const cleanMission = normalizeText(mission);
        const stopWords = ['trouve', 'chercher', 'un', 'une', 'le', 'la', 'les', 'des', 'clone', 'qui', 'aime', 'veut', 'est', 'de', 'du', 'et', 'ou', 'je', 'tu', 'il'];

        const rawWords = cleanMission.split(/\s+/);
        const keywords = rawWords.filter((w: string) => w.length > 2 && !stopWords.includes(w));

        if (keywords.length === 0) {
            return NextResponse.json({ candidates: [], message: "⚠️ Précisez votre recherche (ex: 'expert café')." });
        }

        console.log(`[MISSION] Mots-clés : ${keywords.join(', ')}`);

        // 2. RECHERCHE DANS LES SOUVENIRS (MEMORY)
        // On cherche si le contenu contient l'un des mots clés
        const queryBuilder = keywords.map(w => `content.ilike.%${w}%`).join(',');

        const { data: memoryMatches, error: memoryError } = await supabase
            .from('Memory')
            .select('profileId, content')
            .neq('profileId', profileId) // Pas moi-même
            .or(queryBuilder)
            .limit(50);

        if (memoryError) throw memoryError;

        if (!memoryMatches || memoryMatches.length === 0) {
            return NextResponse.json({ candidates: [], message: `🕵️‍♂️ Aucun écho pour : [${keywords.join(', ')}].` });
        }

        // 3. RÉCUPÉRATION DES PROFILS (Avec la bonne colonne 'name')
        const foundProfileIds = [...new Set(memoryMatches.map(m => m.profileId))];

        const { data: profiles, error: profileError } = await supabase
            .from('Profile')
            .select('id, name') // <--- VERIFIÉ: 'name' existe dans votre CSV
            .in('id', foundProfileIds);

        if (profileError) {
            console.error("Erreur lecture Profil:", profileError);
        }

        if (!profiles || profiles.length === 0) {
            return NextResponse.json({ candidates: [], message: `⚠️ Souvenirs détectés, mais profils fantômes (IDs: ${foundProfileIds.join(', ')}).` });
        }

        // 4. FORMATAGE DES RÉSULTATS
        const candidates = profiles.map(p => {
            // On retrouve le souvenir qui a matché pour l'afficher
            const userMemories = memoryMatches.filter(m => m.profileId === p.id);
            const bestMemory = userMemories[0]?.content || "Donnée classifiée";

            return {
                cloneId: p.id,
                name: p.name, // On renvoie le nom corrigé
                compatibility: Math.min(99, 70 + (userMemories.length * 10)),
                matchReason: `🧠 Mémoire : "${bestMemory.substring(0, 50)}..."`
            };
        });

        return NextResponse.json({
            candidates: candidates,
            message: `✅ Cible acquise. ${candidates.length} profil(s) identifié(s).`
        });

    } catch (e: any) {
        console.error("Crash Mission:", e);
        return NextResponse.json({ candidates: [], message: `Erreur système: ${e.message}` });
    }
}