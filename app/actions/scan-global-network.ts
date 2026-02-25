'use server'

import { Mistral } from '@mistralai/mistralai';
import { prisma } from "@/lib/prisma";
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function scanGlobalNetwork(userId: string, mode: 'basic' | 'deep' = 'basic') {
  // 1. Initialiser le client Supabase sécurisé (Phase 2)
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
  const embRes = await client.embeddings.create({
    model: "mistral-embed",
    inputs: [searchIntent]
  });
  const queryEmbedding = embRes.data[0].embedding;

  // 4. PRE-FILTRAGE RAG : Le Sonar Vectoriel !
  const { data: matchedMemories, error: rpcError } = await supabase.rpc('match_network_memories', {
    query_embedding: queryEmbedding,
    match_threshold: 0.0, // <--- METS 0.0 POUR LE TEST
    match_count: 5,        // On ne prend que le Top 5 absolu du réseau
    exclude_profile_id: userId
  });

  if (rpcError) {
    console.error("Erreur RPC:", rpcError);
    throw new Error("Erreur de recherche vectorielle.");
  }

  // 5. Analyse des résultats
  if (!matchedMemories || matchedMemories.length === 0) {
    return {
      globalStatus: "SILENT",
      analysisSummary: "Le réseau est silencieux. Aucune synergie forte détectée.",
      targetId: null,
      overallMatchScore: 0,
      targetClassification: "Aucune cible",
      unifiedAnalysis: "Pas assez de données convergentes sur le réseau actuel.",
      strategicAlignment: "Poursuivre l'ingestion de données."
    };
  }

  // On extrait les IDs des profils uniques qui possèdent ces mémoires pertinentes
  const matchedProfileIds: string[] = Array.from(new Set(matchedMemories.map((m: any) => String(m.profile_id))));

  // On récupère uniquement ces quelques profils depuis la base de données
  const networkNodes = await prisma.profile.findMany({
    where: { id: { in: matchedProfileIds } },
    select: { id: true, profession: true, objectives: true }
  });

  // Assemblage du contexte strict pour Mistral (Plus de saturation mémoire !)
  const contexteMemoire = matchedMemories.map((m: any) => `[ID: ${m.profile_id}] ${m.content}`).join('\n');
  const identityContext = `Profession: ${agent.profession}. Objectifs: ${agent.objectives?.join(', ')}`;

  const promptContent = `
Tu es l'IA Tactique MISTRAL-TWIN. 
CONTEXTE DE MON AGENT : ${identityContext}

CIBLES DU RÉSEAU (Pré-filtrées mathématiquement) : 
${JSON.stringify(networkNodes)}

🧠 MÉMOIRES INTERCEPTÉES SUR CES CIBLES :
"""
${contexteMemoire}
"""

⚠️ RÈGLES DE CENSURE :
- Ne JAMAIS inclure de nom propre (utilise des rôles).
- Réponds UNIQUEMENT en JSON valide.

MISSION : Analyse ces données ciblées. Identifie la cible la plus pertinente et rédige un rapport.

FORMAT DE RÉPONSE OBLIGATOIRE :
{
  "globalStatus": "DETECTED", 
  "analysisSummary": "Une phrase d'accroche courte style radar (ex: 'Écho radar puissant : Profil ingénieur détecté.')",
  "targetId": "l'UUID exact copié depuis CIBLES DU RÉSEAU",
  "overallMatchScore": 95,
  "targetClassification": "Description (ex: Fabricant de matériaux)",
  "unifiedAnalysis": "Pourquoi ça match avec l'Agent (2 phrases max).",
  "strategicAlignment": "Bénéfice tactique."
}

À la fin de ton analyse textuelle, tu DOIS inclure ce tag exact contenant les coordonnées GPS de la cible identifiée :
[TARGETS: [{"name": "Nom Réel de la Cible", "lat": 48.6493, "lng": -2.0257}]]
`;

  // 6. SYNTHÈSE IA (Sur une donnée restreinte et maîtrisée)
  const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [{ role: "system", content: promptContent }]
  });

  const rawContent = (response.choices?.[0].message.content as string) || "";
  if (!rawContent) throw new Error("Réponse vide de Mistral");
  console.log("[MISTRAL RAW OUTPUT] :", rawContent);

  // Copie EXACTEMENT cette logique de parsing que nous avons validée
  const targetMatch = rawContent.match(/\[TARGETS:\s*(\[[\s\S]*\])\]/);
  let targets: any[] = [];

  if (targetMatch && targetMatch[1]) {
    try {
      const jsonString = targetMatch[1].trim();
      targets = JSON.parse(jsonString);
      console.log("[RESEAU - SUCCES] Coordonnées décodées :", targets);
    } catch (error) {
      console.error("[RESEAU - CRITIQUE] JSON.parse a échoué :", targetMatch[1]);
    }
  }

  // Nettoyage pour récupérer l'analyse JSON originelle
  const cleanJsonContent = rawContent.replace(/\[TARGETS:[\s\S]*?\]/g, '').trim();
  const jsonMatch = cleanJsonContent.match(/\{[\s\S]*\}/);
  const aiAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleanJsonContent);

  // Blindage UUID
  const validatedTargetId = networkNodes.some(n => n.id === aiAnalysis.targetId)
    ? aiAnalysis.targetId
    : networkNodes[0]?.id;

  return {
    ...aiAnalysis,
    targetId: validatedTargetId,
    targets
  };
}