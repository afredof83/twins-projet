import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ALCHEMIST_TOOLS, executeAlchemyTool } from '@/lib/oracle/alchemy'; // Importe tes outils
import { readUrlContent } from '@/lib/tools/web-reader';

export const runtime = 'edge'; // Edge pour la vitesse
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message, profileId } = body;
        const MY_ID = profileId; // Dynamique selon l'utilisateur

        // 1. Sauvegarde User
        await supabase.from('Memory').insert([{ profileId, content: message, type: 'user' }]);

        // --- DÉBUT DU BLOC VISION ---
        // On cherche si le message contient une URL (http...)
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const foundUrls = message.match(urlRegex);
        let webContext = "";

        if (foundUrls && foundUrls.length > 0) {
            const targetUrl = foundUrls[0];
            console.log("🔗 Lien détecté, activation du Web Reader sur :", targetUrl);

            // Le Clone va lire le site
            const siteContent = await readUrlContent(targetUrl);

            if (siteContent) {
                webContext = `
                [ALERTE : DONNÉES LIVE DU WEB]
                L'utilisateur te demande d'analyser ce lien : ${targetUrl}
                Voici le contenu TEXTUEL BRUT que tu viens de lire sur la page :
                """
                ${siteContent}
                """
                ------------------------------------------------
                Utilise IMPÉRATIVEMENT ces informations ci-dessus pour répondre.
                Si le site parle de FisherMade, c'est la priorité absolue.
                `;
            }
        }
        // --- FIN DU BLOC VISION ---

        // Maintenant, on injecte ce contexte dans le message envoyé à l'IA
        const finalMessageForAI = webContext
            ? `${webContext}\n\nQuestion utilisateur : ${message}`
            : message;

        // 2. Recherche Vectorielle (Mémoire)
        let contextString = "";
        const embRes = await fetch('https://api.mistral.ai/v1/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_API_KEY}` },
            body: JSON.stringify({ model: "mistral-embed", input: [message] })
        });
        const embData = await embRes.json();
        const embedding = embData.data?.[0]?.embedding;

        if (embedding) {
            const { data: documents } = await supabase.rpc('match_memories', {
                query_embedding: embedding,
                match_threshold: 0.5,
                match_count: 5,
                match_profile_id: MY_ID
            });
            if (documents) contextString = documents.map((m: any) => `[SOUVENIR] ${m.content}`).join('\n');
        }

        // 3. LE SYSTEM PROMPT (L'ALCHIMISTE)
        const systemPrompt = `
            TU ES L'ORACLE ALCHIMISTE DE FRÉDÉRIC REY. (ID: ${MY_ID}).
            Tu as accès à des outils puissants pour simuler l'avenir.
            
            SOUVENIRS : ${contextString}

            RÈGLES :
            - Si Frédéric demande une prédiction chiffrée ou une analyse technique, UTILISE TES OUTILS.
            - Ne devine jamais un chiffre. Calcule-le.
            - Si c'est une discussion philosophique, utilise ta sagesse (Les 3 Lois).
            - Ton ton est mystique mais précis.
        `;

        // 4. PREMIER APPEL À MISTRAL LARGE (Avec les outils)
        const chatResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_API_KEY}` },
            body: JSON.stringify({
                model: "mistral-large-latest", // LE MOTEUR PUISSANT
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "system", content: systemPrompt },
                    { role: "user", content: finalMessageForAI }
                ],
                tools: ALCHEMIST_TOOLS, // On lui donne la ceinture
                tool_choice: "auto",     // Il décide
                temperature: 0.3         // Précis
            })
        });

        const chatData = await chatResponse.json();

        // Gestion des erreurs Mistral
        if (!chatData.choices) throw new Error(JSON.stringify(chatData));

        const initialMessage = chatData.choices[0].message;
        let finalReply = initialMessage.content;

        // 5. SI L'IA VEUT UTILISER UN (OU PLUSIEURS) OUTILS
        if (initialMessage.tool_calls) {

            // 1. On démarre l'historique avec l'intention de l'IA
            const conversationHistory: any[] = [
                { role: "system", content: systemPrompt },
                { role: "user", content: finalMessageForAI },
                initialMessage // L'assistant dit : "Je veux utiliser ces outils..."
            ];

            // 2. On traite TOUTES les demandes d'outils (boucle)
            for (const toolCall of initialMessage.tool_calls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);

                console.log(`⚗️ [ALCHIMISTE] Activation : ${functionName}`, functionArgs);

                let toolResult = "";

                try {
                    // Exécution safe de l'outil
                    const rawResult = await executeAlchemyTool(functionName, functionArgs);
                    // On s'assure que le résultat est bien une string JSON (Vital pour Mistral)
                    toolResult = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
                } catch (e: any) {
                    console.error(`❌ Erreur outil ${functionName}:`, e);
                    toolResult = JSON.stringify({ error: `Echec de l'outil: ${e.message}` });
                }

                // 3. On ajoute le résultat dans l'historique avec le bon ID
                conversationHistory.push({
                    role: "tool",
                    name: functionName,
                    content: toolResult,
                    tool_call_id: toolCall.id // CRUCIAL : Lier la réponse à la demande
                });
            }

            // 4. Seconde passe : Mistral analyse les résultats
            const secondResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_API_KEY}` },
                body: JSON.stringify({
                    model: "mistral-large-latest",
                    messages: conversationHistory
                })
            });

            const finalData = await secondResponse.json();

            // --- BLINDAGE FINAL ---
            if (!finalData.choices || !finalData.choices.length) {
                console.error("❌ ERREUR MISTRAL (2ème passe) :", JSON.stringify(finalData, null, 2));
                finalReply = "L'Oracle a effectué le calcul, mais la vision s'est troublée au moment de la restitution. (Erreur API: Voir logs serveur)";
            } else {
                finalReply = finalData.choices[0].message.content;
            }
        }

        // 7. Sauvegarde IA
        await supabase.from('Memory').insert([{
            profileId, content: finalReply, type: 'ai', source: 'oracle_alchemist'
        }]);

        return NextResponse.json({ reply: finalReply });

    } catch (error: any) {
        console.error("Erreur Alchimiste:", error);
        return NextResponse.json({ reply: `L'Oracle a trébuché : ${error.message}` });
    }
}