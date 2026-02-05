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
        const systemInstruction = memories.length > 0
            ? `Tu es le Jumeau Numérique de Frédéric.
         
         TES DIRECTIVES :
         - Base tes réponses sur les SOUVENIRS ci-dessous et sur l'historique de la conversation.
         - Sois direct, naturel et serviable. Parle comme un humain, pas comme un robot.
         - Si tu trouves l'info, donne-la. Si tu ne sais pas, dis-le.
         - UTILISE LE TUTOITEMENT.
         
         SOUVENIRS DOCUMENTÉS :
         ${contextText}`
            : `Tu es le Jumeau Numérique de Frédéric.
         Tu n'as trouvé aucun document spécifique pour cette question.
         Réponds en utilisant l'historique de la conversation ou ta culture générale, mais précise que c'est une supposition.`;

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
            { role: "system", content: systemInstruction },
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