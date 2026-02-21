'use server'

import { Mistral } from '@mistralai/mistralai';
import { prisma } from "@/lib/prisma";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function scanGlobalNetwork(userId: string, mode: 'basic' | 'deep' = 'basic') {
  // 1. RÃ©cupÃ©ration du profil agent
  const agent: any = await prisma.profile.findUnique({
    where: { id: userId }
  });

  if (!agent) throw new Error("Agent introuvable.");

  // 2. RÃ©cupÃ©ration du rÃ©seau
  const networkNodes: any[] = await prisma.profile.findMany({
    where: { id: { not: userId } },
    include: { memories: { take: 5, orderBy: { createdAt: 'desc' } } }
  });

  const identityContext = `
        AGENT PRINCIPAL:
        - Profession: ${agent.profession || 'Inconnue'}
        - Ã‚ge: ${agent.age || 'Inconnu'}
        - Objectifs: ${agent.objectives?.join(', ') || 'Scan Global'}
        - Hobbies: ${agent.hobbies?.join(', ') || 'N/A'}
    `;

  // â”€â”€ PROMPT BASIC : lÃ©ger, rapide, Ã©conomie de tokens â”€â”€
  const basicPrompt = `
        Tu es l'IA Tactique MISTRAL-TWIN. Tu dois rÃ©pondre UNIQUEMENT en JSON valide, sans aucun texte avant ou aprÃ¨s.

        CONTEXTE DE L'AGENT : ${identityContext}
        RÃ‰SEAU (${networkNodes.length} nÅ“ud(s)) : ${JSON.stringify(networkNodes.map(n => ({ id: n.id, name: n.name, profession: n.profession })))}

        MISSION : Ã‰value la situation globale du rÃ©seau en 2 phrases maximum.

        RÃˆGLE ABSOLUE : RÃ©ponds UNIQUEMENT avec ce JSON exact (sans clÃ© "opportunities") :
        {
          "globalStatus": "GREEN",
          "analysisSummary": "RÃ©sumÃ© de la situation du rÃ©seau en 1-2 phrases."
        }
    `;

  // â”€â”€ PRÃ‰PARATION DES MÃ‰MOIRES â”€â”€
  const contexteMemoire = networkNodes
    .flatMap(node => node.memories.map((m: any) => `[ID: ${node.id}] ${m.content}`))
    .join('\n');

  // â”€â”€ PROMPT DEEP : analyse consolidÃ©e, bloc unique, censure PII â”€â”€
  const deepPrompt = `
        Tu es une IA d'analyse tactique. Tu dois analyser les profils ci-dessous et gÃ©nÃ©rer une rÃ©ponse STRICTEMENT au format JSON valide, sans aucun texte avant ou aprÃ¨s.
        
        CONTEXTE DE L'AGENT : ${identityContext}
        RÃ‰SEAU DISPONIBLE (IDs et rÃ´les uniquement) : ${JSON.stringify(networkNodes.map(n => ({ id: n.id, profession: n.profession, hobbies: n.hobbies, objectives: n.objectives })))}

        ðŸ§  ARCHIVES ET MÃ‰MOIRES INTERCEPTÃ‰ES (TRÃˆS IMPORTANT POUR L'ANALYSE) :
        """
        ${contexteMemoire || "Aucune archive disponible."}
        """

        âš ï¸ RÃˆGLES DE CENSURE ABSOLUES (NIVEAU OMEGA) :
        - NE JAMAIS inclure de nom propre, de nom de famille ou de prÃ©nom.
        - NE JAMAIS inclure d'adresse email.
        - NE JAMAIS inclure de numÃ©ro de tÃ©lÃ©phone ou d'adresse physique.
        - DÃ©signe toujours la cible par son rÃ´le gÃ©nÃ©rique (ex: "Le Fabricant", "L'Expert en PI", "Le DÃ©veloppeur Senior").

        MISSION : Identifie le MEILLEUR profil du rÃ©seau pour l'Agent en te basant sur les ARCHIVES INTERCEPTÃ‰ES, puis gÃ©nÃ¨re une analyse consolidÃ©e.

        RÃˆGLE ABSOLUE : RÃ©ponds UNIQUEMENT avec ce JSON exact (camelCase strict) :
        {
          "targetId": "l'UUID exact de la cible choisie, copiÃ© depuis la liste RÃ‰SEAU ci-dessus",
          "overallMatchScore": 95,
          "targetClassification": "Description gÃ©nÃ©rique du profil (ex: DÃ©tenteur de brevet en ingÃ©nierie mÃ©canique)",
          "unifiedAnalysis": "Une analyse profonde, globale et unique des synergies possibles entre l'Agent et la cible. Min 2 phrases.",
          "strategicAlignment": "Le bÃ©nÃ©fice tactique final et concret de cette connexion pour l'Agent."
        }
    `;

  const promptContent = mode === 'basic' ? basicPrompt : deepPrompt;

  // ðŸš¨ LE DÃ‰TECTEUR DE MENSONGE (Debug Log demandÃ©)
  console.log("ðŸ§  PROMPT ENVOYÃ‰ Ã€ MISTRAL (Global Scan) :", promptContent);

  if (!promptContent || promptContent.trim() === "") {
    console.warn("âš ï¸ ALERTE : Prompt vide pour le scan global !");
  }

  const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [{ role: "system", content: promptContent }],
    responseFormat: { type: "json_object" }
  });

  const rawContent = response.choices?.[0].message.content;
  if (!rawContent) throw new Error("RÃ©ponse vide de Mistral");

  const aiAnalysis = JSON.parse(rawContent as string);

  // â”€â”€ FUSION TACTIQUE : injection blindÃ©e du targetId â”€â”€
  // Mistral peut oublier ou halluciner l'UUID. On valide qu'il correspond
  // Ã  un nÅ“ud rÃ©el du rÃ©seau. Si invalide, on prend le premier nÅ“ud comme fallback.
  const knownIds = new Set(networkNodes.map(n => n.id));
  const validatedTargetId = knownIds.has(aiAnalysis.targetId)
    ? aiAnalysis.targetId
    : (networkNodes[0]?.id ?? null);

  console.log(`[SCAN-DEEP] targetId Mistral: ${aiAnalysis.targetId} â†’ validÃ©: ${validatedTargetId}`);

  return {
    ...aiAnalysis,
    targetId: validatedTargetId, // Toujours prÃ©sent, toujours fiable
  };
}
