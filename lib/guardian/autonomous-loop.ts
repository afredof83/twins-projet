import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';
import { guardianSelfReflection } from '@/lib/guardian/brain';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// Simulation simplifiée des fonctions internes pour l'instant
async function scanOtherClones(profileId: string) {
    // Réutilise la logique de l'intention ou du radar interne
    const { data: intentions } = await supabase
        .from('Intention')
        .select('*')
        .neq('profileId', profileId)
        .eq('isPublic', true)
        .eq('status', 'SEEKING')
        .limit(3);
    return intentions || [];
}

async function ingestSecretlyRelevantNews(profileId: string) {
    // Version ultra-ciblée de l'ancien radar
    // Pour la démo, on renvoie une info fictive pertinente si on n'a pas de vrai flux API
    return [
        { title: "Brevet FR2513 expiré dans le domaine des leurres souples", urgency: "HIGH", context: "Occasion de déposer une variante." }
    ];
}

async function createGuardianIntervention(profileId: string, content: string) {
    // Stocke l'intervention pour que l'UI la récupère
    // On pourrait utiliser une table 'Intervention' ou 'Memory' avec type spécial
    await supabase.from('Memory').insert({
        profileId,
        content: `[GARDIEN:INTERVENTION] ${content}`,
        type: 'directive', // ou 'system'
        source: 'guardian_autonomous_loop'
    });
    console.log(`🛡️ [GARDIEN] Intervention créée pour ${profileId}`);
}

// Ce fichier devient l'unique moteur de ton Gardien qui orchestre tout
export async function runGuardianCycle(profileId: string) {
    console.log(`🔄 [GARDIEN] Cycle autonome démarré pour ${profileId}`);

    // 1. PERCEPTION (Ancien Radar/Sentinelle maintenant invisible)
    const internalMatches = await scanOtherClones(profileId); // Cherche les autres humains compatibles
    const webSignals = await ingestSecretlyRelevantNews(profileId); // Veille ciblée (uniquement ce qui te concerne)

    // 2. RÉFLEXION (L'Oracle interne)
    const decision = await mistral.chat.complete({
        model: "mistral-large-latest",
        messages: [
            { role: "system", content: "Tu es le Gardien de Frédéric Rey. Ton but est son épanouissement et la réussite de FisherMade. Tu agis seul. Si tu trouves une opportunité réelle ou un match avec un autre clone, prépare une intervention. Si c'est calme, ne dis rien (réponds 'RIEN')." },
            { role: "user", content: `Signaux détectés : ${JSON.stringify({ internalMatches, webSignals })}` }
        ]
    });

    const content = decision.choices?.[0].message.content;

    // 3. ACTION (Spontanéité)
    // Si le Gardien juge l'info CRITIQUE (pas 'RIEN'), il crée une "Intervention"
    if (content && !content.includes("RIEN") && content.length > 20) {
        await createGuardianIntervention(profileId, content);
        return { intervention: content };
    }

    return { intervention: null };
}
