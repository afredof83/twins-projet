import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// Récupère le contexte vital du Twin (Derniers souvenirs, Radar)
async function getContext(profileId: string) {
    const { data: memories } = await supabase
        .from('Memory')
        .select('content')
        .eq('profileId', profileId)
        .order('createdAt', { ascending: false })
        .limit(5);

    // On suppose qu'on peut récupérer quelques mots-clés du profil ou des souvenirs récents
    // Pour l'instant, hardcodé ou dérivé simplement
    return {
        recentMemories: memories?.map(m => m.content).join('\n') || "",
        keywords: ["pêche", "innovation", "brevet", "industrie", "var"]
    };
}

// Simule ou récupère les signaux radar récents (peut être étendu)
async function getRadarSignals() {
    // Pourrait appeler l'API radar interne
    return [];
}

export async function guardianSelfReflection(profileId: string) {
    console.log(`🤖 [GARDIEN] Cycle de réflexion pour ${profileId}...`);

    // 1. Récupérer tes dernières données (Brevets, Radar, Humeur)
    const myContext = await getContext(profileId);
    const externalSignals = await getRadarSignals();

    // 2. Chercher des matchs avec d'autres clones (via Intentions)
    // Note: 'containedBy' est spécifique Postgres, Supabase supporte 'cs' (contains) ou 'ov' (overlap) pour les tableaux
    // Ici on fait simple : on récupère tout ce qui est public et pas à nous, et on filtrera/triera
    const { data: potentialMatches } = await supabase
        .from('Intention')
        .select('*')
        .neq('profileId', profileId)
        .eq('isPublic', true)
        .eq('status', 'SEEKING')
        .limit(5);

    // 3. Mistral décide de la meilleure action
    const decision = await mistral.chat.complete({
        model: "mistral-large-latest",
        messages: [{
            role: "system",
            content: "Tu es le Gardien de Frédéric (Projet Twins/FisherMade). TA MISSION : Être proactif. Ne réponds pas à une question. ANALYSE sa situation actuelle et les opportunités externes. Si tu trouves un match avec un autre clone (Match Intention), c'est une priorité absolue : propose une prise de contact. Sinon, pose une question stratégique pour avancer sur ses objectifs (Brevets, Business)."
        }, {
            role: "user",
            content: `CONTEXTE INTERNE (Souvenirs récents) : \n${myContext.recentMemories}\n\nOPPORTUNITÉS EXTERNES (Intentions d'autres Clones) : \n${JSON.stringify(potentialMatches)}\n\nACTION REQUISE : Une phrase courte et percutante pour interpeller Frédéric, ou une proposition de mise en relation si pertinent.`
        }]
    });

    return decision.choices?.[0].message.content || "Le Gardien observe en silence.";
}
