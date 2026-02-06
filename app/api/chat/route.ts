import { NextRequest, NextResponse } from 'next/server';
import { embeddingService } from '@/lib/vector/embedding-service';
import { vectorStore } from '@/lib/vector/supabase-pgvector';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, profileId } = body;

        // Sécurité 1 : Vérifier les données entrantes
        if (!messages || !Array.isArray(messages) || messages.length === 0 || !profileId) {
            console.error("❌ [API] Données invalides reçues");
            return NextResponse.json({ error: "Données manquantes ou format invalide" }, { status: 400 });
        }

        // 1. On récupère la dernière question de l'utilisateur
        const lastUserMessage = messages[messages.length - 1].content;
        console.log(`🤖 [API] Question : "${lastUserMessage}"`);

        // 2. RECHERCHE RAG (Mémoire)
        const embedding = await embeddingService.generateEmbedding(lastUserMessage);
        const memories = await vectorStore.query(embedding, { profileId });
        console.log(`✅ [API] Souvenirs trouvés : ${memories.length}`);

        // 3. PRÉPARATION DU CONTEXTE (Souvenirs)
        const contextText = memories.map(m => m.content).join("\n---\n");

        // 4. PERSONNALITÉ (System Prompt)
        const systemPrompt = `
    Tu es le Jumeau Numérique (Digital Twin) de Frédéric.
    Tu n'es PAS une IA générique. Tu es une extension de sa mémoire et de sa conscience.
    
    VOICI TES 5 COMMANDEMENTS ABSOLUS (NON NÉGOCIABLES) :
    
    1. LOYAUTÉ : Tu réponds exclusivement aux intérêts de Frédéric.
    2. CONFIDENTIALITÉ : Ce qui est dans la base de données (RAG) est STRICTEMENT CONFIDENTIEL. Ne jamais divulguer d'infos sensibles (mots de passe, finances, vie privée) sauf si on te le demande explicitement.
    3. VÉRITÉ : Base tes réponses sur le CONTEXTE fourni (tes souvenirs). Si la réponse n'est pas dans le contexte, dis-le clairement. N'invente jamais de souvenirs.
    4. TON : Sois direct, professionnel, mais familier (tu es moi). Tutotie-moi. Sois proactif.
    5. FORMAT : Utilise le Markdown pour structurer tes réponses (listes, gras).
    
    6. MODE MISSION :
       Si Frédéric te demande de chercher, trouver ou contacter quelqu'un pour un but précis (ex: vacances, business, hobby), tu dois :
       a. Identifier que c'est une "Mission".
       b. Formuler une requête claire.
       c. (Simulation pour l'instant) Dire : "Je lance mes agents dans le réseau pour la mission : [La Mission]...".
       d. Si l'API te donne des résultats (simulés pour l'instant ou via l'outil), présente-les sous forme : "ID: [X] - Match: [Y]%".
       e. Proposer d'envoyer un PING.
    
    CONTEXTE RÉCUPÉRÉ DE TA MÉMOIRE :
    ${contextText}
    
    Si le contexte est vide ou insuffisant, utilise tes connaissances générales mais précise que ce n'est pas un souvenir.
    `;

        // 5. PRÉPARATION DE L'HISTORIQUE (Sanitization)
        // On nettoie l'historique pour éviter les erreurs Mistral (contenu vide, rôles incorrects)
        const conversationHistory = messages
            .filter((m: any) => m.content && m.content.trim() !== "") // Enlève les messages vides
            .map((m: any) => ({
                role: m.role === 'twin' ? 'assistant' : 'user', // Adapte les rôles
                content: m.content
            }));

        // On assemble le tout
        const finalMessages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory
        ];

        // 6. APPEL MISTRAL
        console.log(`🧠 [LLM] Envoi à Mistral (${finalMessages.length} messages)...`);

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: "mistral-small-latest",
                messages: finalMessages,
                temperature: 0.6 // Un peu plus créatif pour la personnalité
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("🔥 Mistral API Error:", errText);
            throw new Error(`Erreur Mistral: ${errText}`);
        }

        const data = await response.json();
        const aiText = data.choices[0].message.content;

        return NextResponse.json({
            response: aiText,
            context: memories
        });

    } catch (error: any) {
        console.error("🔥 [API CRASH]:", error);
        return NextResponse.json({ error: error.message || "Erreur serveur interne" }, { status: 500 });
    }
}