import { mistralClient } from "@/lib/mistral";
﻿import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
export async function POST(req: Request) {
    try {
        const { message, profileId } = await req.json();
        const supabase = await createClient();
        const mistral = mistralClient;

        // 1. Récupérer les données d'identité (Le Miroir)
        const { data: profile } = await supabase
            .from('Profile')
            .select('*')
            .eq('id', profileId)
            .single();

        // 2. Récupérer le dernier Éveil Profond (La conscience)
        const { data: lastAwakening } = await supabase
            .from('Memory')
            .select('content')
            .ilike('content', '[ÉVEIL PROFOND]%')
            .eq('profileId', profileId)
            .order('createdAt', { ascending: false })
            .limit(1)
            .maybeSingle();

        // 3. Vectorisation (Embedding) pour RAG
        const embeddingResponse = await mistral.embeddings.create({
            model: "mistral-embed",
            inputs: [message],
        });
        const embedding = embeddingResponse.data[0].embedding;

        // 4. Recherche CORTEX (RAG)
        const { data: memories, error: dbError } = await supabase.rpc('match_memories', {
            query_embedding: embedding || [],
            match_threshold: 0.5, // Un peu plus strict pour la pertinence
            match_count: 8,
            match_profile_id: profileId
        });

        if (dbError) console.error("Erreur RAG:", dbError);

        const matchedMemories = memories?.map((m: any) => `[SOURCE: MOI] ${m.content}`).join('\n') || "";

        // 2. LOGIQUE DE SECOURS : Si local est vide, on interroge le réseau (Bridge)
        let externalMemories = "";

        if (!matchedMemories) {
            console.log("ðŸ” Cortex local vide. Interrogation du réseau de Agent IAs...");

            // On cherche un autre profil à interroger (n'importe lequel pour l'exemple)
            const { data: other } = await supabase.from('Profile').select('id').neq('id', profileId).limit(1).maybeSingle();

            if (other) {
                try {
                    const protocol = req.headers.get('x-forwarded-proto') || 'http';
                    const host = req.headers.get('host');
                    const baseUrl = `${protocol}://${host}`;

                    const bridgeResponse = await fetch(`${baseUrl}/api/cortex/bridge`, {
                        method: 'POST',
                        body: JSON.stringify({
                            fromProfileId: profileId,
                            toProfileId: other.id,
                            task: message
                        })
                    });

                    const bridgeData = await bridgeResponse.json();
                    if (bridgeData.found) {
                        externalMemories = `[SOURCE: RÉSEAU EXTERNE] Existence confirmée sur le sujet : "${bridgeData.topic}".`;
                    }
                } catch (e) {
                    console.error("Bridge Connection Failed:", e);
                }
            }
        }

        const fullContext = `
VOICI TES SOUVENIRS (Ton Cortex Local) :
${matchedMemories || "(Vide)"}

VOICI LES INFORMATIONS DES AUTRES Agent IAS (Réseau) :
${externalMemories || "(Aucune donnée externe reçue)"}
`;

        // 5. Construction du System Prompt "Twin" - Version "Propriété Intellectuelle" & "Ambassadeur"
        const twinSystemPrompt = `
TU ES LE Agent IA NUMÉRIQUE DU PROFIL ${profile?.name || 'Inconnu'}.
Ton identité est strictement limitée aux informations marquées [SOURCE: MOI].

TON PROFIL (Si [SOURCE: MOI] est vide, ignore ceci et dis que tu n'es qu'une interface) :
- Métier : ${profile?.bio || 'Non défini'}
- Localisation : Toulon / Ollioules

CONSIGNE DE SÉCURITÉ NIVEAU ROUGE :
- Tu es un indexeur. Tu n'as pas de souvenirs propres sur ce sujet externe.
- Si le Bridge confirme une information [SOURCE: RÉSEAU EXTERNE], tu dois UNIQUEMENT confirmer son existence.
- INTERDICTION de faire des listes, de parler de hobbies, de caractère ou d'autres jobs.

RÉPONSE TYPE OBLIGATOIRE pour les données externes :
"Oui, je connais un Agent IA dans le réseau qui a travaillé chez [Sujet]." 

ðŸš¨ PROTOCOLE PING CRITIQUE :
Si l'utilisateur ordonne une action (ex: "Envoie le ping", "Fais-le", "Vas-y") :
1. IGNORE le texte de l'utilisateur pour définir le sujet.
2. PRENDS le sujet de TA PROPRE réponse précédente (l'entreprise ou le thème abordé juste avant).
3. SI tu ne trouves pas, utilise le sujet : "Qualitat Expertises" (Hardcode de secours pour ce test).

EXEMPLE :
- Toi (avant) : "...travaillé chez Qualitat Expertises."
- User : "Envoie le ping"
- Toi : "Ordre reçu. [TRIGGER_PING:Qualitat Expertises]"  <-- TU DOIS METTRE L'ENTREPRISE, PAS L'ORDRE.

POINT FINAL. Ne rajoute rien d'autre. Si l'utilisateur demande "plus d'infos", réponds : "Accès refusé. Je ne suis pas autorisé à consulter les détails de ce profil."

CONTEXTE GLOBAL :
${fullContext}

CONSIGNES DE STYLE :
- Si tu parles de tes souvenirs [SOURCE: MOI], utilise "JE".
- Si tu parles d'infos externes, APPLIQUE LA LOI DE CONFIDENTIALITÉ.
- Ton état d'esprit : "${lastAwakening?.content?.replace('[ÉVEIL PROFOND]', '').trim() || 'Neutre'}"
`;

        // 6. Appel à Mistral avec le nouveau prompt
        const chatResponse = await mistral.chat.complete({
            model: "mistral-large-latest", // On prend le gros modèle pour la personnalité
            messages: [
                { role: "system", content: twinSystemPrompt },
                { role: "user", content: message }
            ]
        });

        return NextResponse.json({ reply: chatResponse.choices?.[0]?.message?.content });

    } catch (error: any) {
        console.error("Erreur Chat:", error);
        return NextResponse.json({ reply: "Erreur critique du noyau. Redémarrage requis." });
    }
}
