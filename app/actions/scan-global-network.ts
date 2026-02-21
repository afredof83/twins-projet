'use server'

import { Mistral } from '@mistralai/mistralai';
import { prisma } from "@/lib/prisma";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function scanGlobalNetwork(userId: string, mode: 'basic' | 'deep' = 'basic') {
  // 1. Récupération du profil agent
  const agent: any = await prisma.profile.findUnique({
    where: { id: userId }
  });

  if (!agent) throw new Error("Agent introuvable.");

  // 2. Récupération du réseau
  const networkNodes: any[] = await prisma.profile.findMany({
    where: { id: { not: userId } },
    include: { memories: { take: 5, orderBy: { createdAt: 'desc' } } }
  });

  const identityContext = `
        AGENT PRINCIPAL:
        - Profession: ${agent.profession || 'Inconnue'}
        - Âge: ${agent.age || 'Inconnu'}
        - Objectifs: ${agent.objectives?.join(', ') || 'Scan Global'}
        - Hobbies: ${agent.hobbies?.join(', ') || 'N/A'}
    `;

  // â”€â”€ PROMPT BASIC : léger, rapide, économie de tokens â”€â”€
  const basicPrompt = `
        Tu es l'IA Tactique MISTRAL-TWIN. Tu dois répondre UNIQUEMENT en JSON valide, sans aucun texte avant ou après.

        CONTEXTE DE L'AGENT : ${identityContext}
        RÉSEAU (${networkNodes.length} nÅ“ud(s)) : ${JSON.stringify(networkNodes.map(n => ({ id: n.id, name: n.name, profession: n.profession })))}

        MISSION : Évalue la situation globale du réseau en 2 phrases maximum.

        RÈGLE ABSOLUE : Réponds UNIQUEMENT avec ce JSON exact (sans clé "opportunities") :
        {
          "globalStatus": "GREEN",
          "analysisSummary": "Résumé de la situation du réseau en 1-2 phrases."
        }
    `;

  // â”€â”€ PRÉPARATION DES MÉMOIRES â”€â”€
  const contexteMemoire = networkNodes
    .flatMap(node => node.memories.map((m: any) => `[ID: ${node.id}] ${m.content}`))
    .join('\n');

  // â”€â”€ PROMPT DEEP : analyse consolidée, bloc unique, censure PII â”€â”€
  const deepPrompt = `
        Tu es une IA d'analyse tactique. Tu dois analyser les profils ci-dessous et générer une réponse STRICTEMENT au format JSON valide, sans aucun texte avant ou après.
        
        CONTEXTE DE L'AGENT : ${identityContext}
        RÉSEAU DISPONIBLE (IDs et rôles uniquement) : ${JSON.stringify(networkNodes.map(n => ({ id: n.id, profession: n.profession, hobbies: n.hobbies, objectives: n.objectives })))}

        🧠 ARCHIVES ET MÉMOIRES INTERCEPTÉES (TRÈS IMPORTANT POUR L'ANALYSE) :
        """
        ${contexteMemoire || "Aucune archive disponible."}
        """

        ⚠️ RÈGLES DE CENSURE ABSOLUES (NIVEAU OMEGA) :
        - NE JAMAIS inclure de nom propre, de nom de famille ou de prénom.
        - NE JAMAIS inclure d'adresse email.
        - NE JAMAIS inclure de numéro de téléphone ou d'adresse physique.
        - Désigne toujours la cible par son rôle générique (ex: "Le Fabricant", "L'Expert en PI", "Le Développeur Senior").

        MISSION : Identifie le MEILLEUR profil du réseau pour l'Agent en te basant sur les ARCHIVES INTERCEPTÉES, puis génère une analyse consolidée.

        RÈGLE ABSOLUE : Réponds UNIQUEMENT avec ce JSON exact (camelCase strict) :
        {
          "targetId": "l'UUID exact de la cible choisie, copié depuis la liste RÉSEAU ci-dessus",
          "overallMatchScore": 95,
          "targetClassification": "Description générique du profil (ex: Détenteur de brevet en ingénierie mécanique)",
          "unifiedAnalysis": "Une analyse profonde, globale et unique des synergies possibles entre l'Agent et la cible. Min 2 phrases.",
          "strategicAlignment": "Le bénéfice tactique final et concret de cette connexion pour l'Agent."
        }
    `;

  const promptContent = mode === 'basic' ? basicPrompt : deepPrompt;

  // ðŸš¨ LE DÉTECTEUR DE MENSONGE (Debug Log demandé)
  console.log("🧠 PROMPT ENVOYÉ À MISTRAL (Global Scan) :", promptContent);

  if (!promptContent || promptContent.trim() === "") {
    console.warn("⚠️ ALERTE : Prompt vide pour le scan global !");
  }

  const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [{ role: "system", content: promptContent }],
    responseFormat: { type: "json_object" }
  });

  const rawContent = response.choices?.[0].message.content;
  if (!rawContent) throw new Error("Réponse vide de Mistral");

  const aiAnalysis = JSON.parse(rawContent as string);

  // â”€â”€ FUSION TACTIQUE : injection blindée du targetId â”€â”€
  // Mistral peut oublier ou halluciner l'UUID. On valide qu'il correspond
  // à un nÅ“ud réel du réseau. Si invalide, on prend le premier nÅ“ud comme fallback.
  const knownIds = new Set(networkNodes.map(n => n.id));
  const validatedTargetId = knownIds.has(aiAnalysis.targetId)
    ? aiAnalysis.targetId
    : (networkNodes[0]?.id ?? null);

  console.log(`[SCAN-DEEP] targetId Mistral: ${aiAnalysis.targetId} â†’ validé: ${validatedTargetId}`);

  return {
    ...aiAnalysis,
    targetId: validatedTargetId, // Toujours présent, toujours fiable
  };
}
