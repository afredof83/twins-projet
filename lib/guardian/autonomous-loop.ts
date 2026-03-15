import { mistralClient } from "@/lib/mistral";
import { createClient } from '@supabase/supabase-js';
import { guardianSelfReflection } from '@/lib/guardian/brain';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const mistral = mistralClient;

// Simulation simplifiée des fonctions internes pour l'instant
async function scanOtherAgents(profileId: string) {
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

    // 0. SECURITY: Resolve userId for this profile
    const { data: profile } = await supabase.from('profiles').select('user_id').eq('id', profileId).single();
    if (!profile) return { intervention: null };
    const userId = profile.user_id;

    // 1. PERCEPTION (Ancien Radar/Sentinelle maintenant invisible)
    const internalMatches = await scanOtherAgents(profileId); // Cherche les autres humains compatibles
    const webSignals = await ingestSecretlyRelevantNews(profileId); // Veille ciblée (uniquement ce qui te concerne)

    // 2. RÉFLEXION (L'Oracle interne)
    // Ici, on pourrait aussi appeler guardianSelfReflection(profileId, userId) si on veut une analyse Mistral complexe
    // Pour l'instant on garde la logique de décision directe ou on délègue
    const decision = await mistral.chat.complete({
        model: "mistral-large-latest",
        messages: [
            { role: "system", content: "Tu es le Gardien de Frédéric Rey. Ton but est son épanouissement et la réussite de FisherMade. Tu agis seul. Si tu trouves une opportunité réelle ou un match avec un autre Agent, prépare une intervention. Si c'est calme, ne dis rien (réponds 'RIEN')." },
            { role: "user", content: `Signaux détectés : ${JSON.stringify({ internalMatches, webSignals })}` }
        ]
    });

    const content = decision.choices?.[0].message.content;

    // 3. ACTION (Spontanéité)
    // Si le Gardien juge l'info CRITIQUE (pas 'RIEN'), il crée une "Intervention"
    const textContent = String(content);

    if (textContent && !textContent.includes("RIEN") && textContent.length > 20) {
        await createGuardianIntervention(profileId, textContent);
        return { intervention: textContent };
    }

    return { intervention: null };
}
