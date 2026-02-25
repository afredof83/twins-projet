'use server'
import { mistralClient } from "@/lib/mistral";

import { prisma } from "@/lib/prisma";
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { trackAgentActivity } from '@/app/actions/missions';

const client = mistralClient;

export async function scanGlobalNetwork(userId: string, mode: 'basic' | 'deep' = 'basic') {
  // 1. Initialiser le client Supabase sécurisé
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; }
      }
    }
  );

  // 2. Récupération du profil agent pour définir l'intention de recherche
  const agent: any = await prisma.profile.findUnique({
    where: { id: userId }
  });
  if (!agent) throw new Error("Agent introuvable.");

  // Ce que notre Agent cherche activement :
  const searchIntent = `Profil: ${agent.profession || 'Général'}. Objectifs: ${agent.objectives?.join(', ') || 'Opportunités stratégiques'}`;

  // 3. Transformation en vecteur mathématique (Embeddings)
  const embeddingResponse = await client.embeddings.create({
    model: "mistral-embed",
    inputs: [searchIntent],
  });
  const queryVector = embeddingResponse.data[0].embedding;

  // 4. Recherche RAG dans la mémoire vectorielle
  const { data: ragResults } = await supabase.rpc('match_memories', {
    query_embedding: queryVector,
    match_threshold: 0.75,
    match_count: 10,
    filter_profile_id: userId,
  });

  const contextBlock = ragResults && ragResults.length > 0
    ? ragResults.map((r: any) => `[Score: ${r.similarity?.toFixed(2)}] ${r.content}`).join('\n')
    : 'Aucune mémoire pertinente trouvée dans la base vectorielle.';

  // 5. Construction du prompt selon le mode
  const promptContent = mode === 'deep'
    ? `Tu es TWINS_INTEL, un moteur d'analyse stratégique avancé.
Analyse ce profil et ses données mémoire en profondeur pour identifier des opportunités de connexion et de collaboration.

AGENT:
- Nom: ${agent.name || 'Agent'}
- Profession: ${agent.profession || 'Non spécifiée'}
- Objectifs: ${agent.objectives?.join(', ') || 'Exploration'}
- Bio: ${agent.bio || 'Aucune'}
- Analyse unifiée: ${agent.unifiedAnalysis || 'Aucune'}

DONNÉES MÉMOIRE PERTINENTES:
${contextBlock}

Génère un rapport JSON structuré STRICT avec EXACTEMENT ces champs:
{
  "globalStatus": "GREEN" ou "ORANGE" ou "RED",
  "analysisSummary": "Résumé de l'analyse en 2-3 phrases.",
  "overallMatchScore": 0-100,
  "targetClassification": "Classification du profil cible",
  "unifiedAnalysis": "Analyse détaillée du potentiel de l'agent.",
  "strategicAlignment": "Comment l'agent peut capitaliser sur ses forces.",
  "targetId": "${userId}",
  "targets": [
    {"name": "Nom entité", "lat": 48.8, "lng": 2.3, "type": "contact|company|opportunity"}
  ],
  "opportunities": [
    {"title": "Titre opportunité", "reasoning": "Pourquoi c'est pertinent", "priority": 1-10}
  ]
}`
    : `Tu es TWINS_INTEL, un radar de surface rapide.
Fais une analyse de surface du profil suivant pour identifier le statut général et les directions stratégiques.

AGENT:
- Nom: ${agent.name || 'Agent'}
- Profession: ${agent.profession || 'Non spécifiée'}
- Objectifs: ${agent.objectives?.join(', ') || 'Exploration'}

DONNÉES MÉMOIRE:
${contextBlock}

Génère un rapport JSON structuré STRICT avec EXACTEMENT ces champs:
{
  "globalStatus": "GREEN" ou "ORANGE" ou "RED",
  "analysisSummary": "Résumé bref en 1-2 phrases.",
  "targetId": "${userId}",
  "targets": [
    {"name": "Nom entité", "lat": 48.8, "lng": 2.3, "type": "contact|company|opportunity"}
  ]
}`;

  // 6. Appel Mistral avec format JSON forcé
  const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [{ role: "system", content: promptContent }],
    responseFormat: { type: "json_object" }
  });

  const rawContent = response.choices?.[0]?.message?.content;

  // 7. DÉCLARATION EN DEHORS DU TRY/CATCH
  let aiAnalysis: any = {};
  let targets: any[] = [];

  // 8. PARSING SÉCURISÉ
  try {
    const cleanJsonContent = (rawContent as string).replace(/\[TARGETS:[\s\S]*?\]/g, '').trim();
    const jsonMatch = cleanJsonContent.match(/\{[\s\S]*\}/);
    const parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleanJsonContent);
    aiAnalysis = parsedData;
    targets = parsedData.targets || [];
  } catch (e) {
    console.error("[RESEAU - CRITIQUE] JSON.parse a échoué pour l'analyse IA :", rawContent);
    throw new Error("Erreur de parsing JSON de la réponse Mistral.");
  }

  // 9. LE RETURN SÉCURISÉ
  await trackAgentActivity(userId, 'scan');

  return {
    ...aiAnalysis,
    targetId: userId,
    targets
  };
}