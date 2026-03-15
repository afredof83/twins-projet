import { mistralClient } from "@/lib/mistral";
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const mistral = mistralClient;

// Récupère le contexte vital de l'Agent Ipse (Derniers souvenirs, Radar)
async function getContext(profileId: string, userId: string) {
    // SECURITY: Verify profile ownership first
    const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', profileId)
        .single();
    
    if (!profile || profile.user_id !== userId) {
        throw new Error('Unauthorized: Profile does not belong to user.');
    }

    const { data: memories } = await supabase
        .from('Memory')
        .select('content')
        .eq('profileId', profileId)
        .order('createdAt', { ascending: false })
        .limit(5);

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

export async function guardianSelfReflection(profileId: string, userId: string) {
    console.log(`🤖 [GARDIEN] Cycle de réflexion pour ${profileId} (user: ${userId})...`);

    // 1. Récupérer tes dernières données (Brevets, Radar, Humeur)
    const myContext = await getContext(profileId, userId);
    const externalSignals = await getRadarSignals();

    // 2. Chercher des matchs avec d'autres Agents (via Intentions)
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
            content: "Tu es le Gardien de Frédéric (Projet Ipse/FisherMade). TA MISSION : Être proactif. Ne réponds pas à une question. ANALYSE sa situation actuelle et les opportunités externes. Si tu trouves un match avec un autre Agent (Match Intention), c'est une priorité absolue : propose une prise de contact. Sinon, pose une question stratégique pour avancer sur ses objectifs (Brevets, Business)."
        }, {
            role: "user",
            content: `CONTEXTE INTERNE (Souvenirs récents) : \n${myContext.recentMemories}\n\nOPPORTUNITÉS EXTERNES (Intentions d'autres Agents) : \n${JSON.stringify(potentialMatches)}\n\nACTION REQUISE : Une phrase courte et percutante pour interpeller Frédéric, ou une proposition de mise en relation si pertinent.`
        }]
    });

    return decision.choices?.[0].message.content || "Le Gardien observe en silence.";
}
