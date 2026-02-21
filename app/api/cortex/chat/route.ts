import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { Mistral } from '@mistralai/mistralai';

export async function POST(req: Request) {
    try {
        const { message, profileId } = await req.json();
        const supabase = await createClient();
        const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

        // 1. RÃ©cupÃ©rer les donnÃ©es d'identitÃ© (Le Miroir)
        const { data: profile } = await supabase
            .from('Profile')
            .select('*')
            .eq('id', profileId)
            .single();

        // 2. RÃ©cupÃ©rer le dernier Ã‰veil Profond (La conscience)
        const { data: lastAwakening } = await supabase
            .from('Memory')
            .select('content')
            .ilike('content', '[Ã‰VEIL PROFOND]%')
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

        // 2. LOGIQUE DE SECOURS : Si local est vide, on interroge le rÃ©seau (Bridge)
        let externalMemories = "";

        if (!matchedMemories) {
            console.log("ðŸ” Cortex local vide. Interrogation du rÃ©seau de Agent IAs...");

            // On cherche un autre profil Ã  interroger (n'importe lequel pour l'exemple)
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
                        externalMemories = `[SOURCE: RÃ‰SEAU EXTERNE] Existence confirmÃ©e sur le sujet : "${bridgeData.topic}".`;
                    }
                } catch (e) {
                    console.error("Bridge Connection Failed:", e);
                }
            }
        }

        const fullContext = `
VOICI TES SOUVENIRS (Ton Cortex Local) :
${matchedMemories || "(Vide)"}

VOICI LES INFORMATIONS DES AUTRES Agent IAS (RÃ©seau) :
${externalMemories || "(Aucune donnÃ©e externe reÃ§ue)"}
`;

        // 5. Construction du System Prompt "Twin" - Version "PropriÃ©tÃ© Intellectuelle" & "Ambassadeur"
        const twinSystemPrompt = `
TU ES LE Agent IA NUMÃ‰RIQUE DU PROFIL ${profile?.name || 'Inconnu'}.
Ton identitÃ© est strictement limitÃ©e aux informations marquÃ©es [SOURCE: MOI].

TON PROFIL (Si [SOURCE: MOI] est vide, ignore ceci et dis que tu n'es qu'une interface) :
- MÃ©tier : ${profile?.bio || 'Non dÃ©fini'}
- Localisation : Toulon / Ollioules

CONSIGNE DE SÃ‰CURITÃ‰ NIVEAU ROUGE :
- Tu es un indexeur. Tu n'as pas de souvenirs propres sur ce sujet externe.
- Si le Bridge confirme une information [SOURCE: RÃ‰SEAU EXTERNE], tu dois UNIQUEMENT confirmer son existence.
- INTERDICTION de faire des listes, de parler de hobbies, de caractÃ¨re ou d'autres jobs.

RÃ‰PONSE TYPE OBLIGATOIRE pour les donnÃ©es externes :
"Oui, je connais un Agent IA dans le rÃ©seau qui a travaillÃ© chez [Sujet]." 

ðŸš¨ PROTOCOLE PING CRITIQUE :
Si l'utilisateur ordonne une action (ex: "Envoie le ping", "Fais-le", "Vas-y") :
1. IGNORE le texte de l'utilisateur pour dÃ©finir le sujet.
2. PRENDS le sujet de TA PROPRE rÃ©ponse prÃ©cÃ©dente (l'entreprise ou le thÃ¨me abordÃ© juste avant).
3. SI tu ne trouves pas, utilise le sujet : "Qualitat Expertises" (Hardcode de secours pour ce test).

EXEMPLE :
- Toi (avant) : "...travaillÃ© chez Qualitat Expertises."
- User : "Envoie le ping"
- Toi : "Ordre reÃ§u. [TRIGGER_PING:Qualitat Expertises]"  <-- TU DOIS METTRE L'ENTREPRISE, PAS L'ORDRE.

POINT FINAL. Ne rajoute rien d'autre. Si l'utilisateur demande "plus d'infos", rÃ©ponds : "AccÃ¨s refusÃ©. Je ne suis pas autorisÃ© Ã  consulter les dÃ©tails de ce profil."

CONTEXTE GLOBAL :
${fullContext}

CONSIGNES DE STYLE :
- Si tu parles de tes souvenirs [SOURCE: MOI], utilise "JE".
- Si tu parles d'infos externes, APPLIQUE LA LOI DE CONFIDENTIALITÃ‰.
- Ton Ã©tat d'esprit : "${lastAwakening?.content?.replace('[Ã‰VEIL PROFOND]', '').trim() || 'Neutre'}"
`;

        // 6. Appel Ã  Mistral avec le nouveau prompt
        const chatResponse = await mistral.chat.complete({
            model: "mistral-large-latest", // On prend le gros modÃ¨le pour la personnalitÃ©
            messages: [
                { role: "system", content: twinSystemPrompt },
                { role: "user", content: message }
            ]
        });

        return NextResponse.json({ reply: chatResponse.choices?.[0]?.message?.content });

    } catch (error: any) {
        console.error("Erreur Chat:", error);
        return NextResponse.json({ reply: "Erreur critique du noyau. RedÃ©marrage requis." });
    }
}
