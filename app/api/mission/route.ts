import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// FONCTION DE NETTOYAGE
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

        // 1. ANALYSE
        const cleanMission = normalizeText(mission);
        const stopWords = ['trouve', 'chercher', 'un', 'une', 'le', 'la', 'les', 'des', 'clone', 'qui', 'aime', 'veut', 'est', 'de', 'du', 'et', 'ou', 'je', 'tu', 'il'];

        const rawWords = cleanMission.split(/\s+/);
        const keywords = rawWords.filter((w: string) => w.length > 2 && !stopWords.includes(w));

        if (keywords.length === 0) {
            return NextResponse.json({ candidates: [], message: "Commande non reconnue. Veuillez préciser les paramètres de recherche." });
        }

        console.log(`[MISSION] Mots-clés : ${keywords.join(', ')}`);

        // 2. RECHERCHE
        const queryBuilder = keywords.map(w => `content.ilike.%${w}%`).join(',');

        const { data: memoryMatches, error: memoryError } = await supabase
            .from('Memory')
            .select('profileId, content')
            .neq('profileId', profileId)
            .or(queryBuilder)
            .limit(50);

        if (memoryError) throw memoryError;

        // --- GESTION ÉCHEC ---
        if (!memoryMatches || memoryMatches.length === 0) {
            // Phrase fluide pour le TTS
            return NextResponse.json({
                candidates: [],
                message: `Négatif. Aucun écho radar pour les mots clés : ${keywords.join(', ')}.`
            });
        }

        // 3. RÉCUPÉRATION PROFILS
        const foundProfileIds = [...new Set(memoryMatches.map(m => m.profileId))];

        const { data: profiles, error: profileError } = await supabase
            .from('Profile')
            .select('id, name')
            .in('id', foundProfileIds);

        if (profileError) console.error("Erreur lecture Profil:", profileError);

        // --- GESTION ÉCHEC TECHNIQUE ---
        if (!profiles || profiles.length === 0) {
            return NextResponse.json({ candidates: [], message: `Alerte. Souvenirs détectés mais profils inaccessibles.` });
        }

        // 4. FORMATAGE & PHRASÉ VOCAL
        const candidates = profiles.map(p => {
            const userMemories = memoryMatches.filter(m => m.profileId === p.id);
            const bestMemory = userMemories[0]?.content || "Donnée classifiée";

            return {
                cloneId: p.id,
                name: p.name,
                compatibility: Math.min(99, 70 + (userMemories.length * 10)),
                matchReason: `🧠 Mémoire : "${bestMemory.substring(0, 50)}..."`
            };
        });

        // --- CRÉATION DU MESSAGE VOCAL PARFAIT ---
        const count = candidates.length;
        let voiceMessage = "";

        if (count === 1) {
            // Singulier fluide
            voiceMessage = `Cible acquise. Un profil compatible identifié.`;
        } else {
            // Pluriel
            voiceMessage = `Cibles multiples. ${count} profils compatibles identifiés.`;
        }

        return NextResponse.json({
            candidates: candidates,
            message: voiceMessage // C'est ce texte que Rachel va lire
        });

    } catch (e: any) {
        console.error("Crash Mission:", e);
        return NextResponse.json({ candidates: [], message: `Erreur système critique : ${e.message}` });
    }
}