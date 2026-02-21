'use server'

import { Mistral } from '@mistralai/mistralai';
import { prisma } from "@/lib/prisma";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// VÃ©rificateur d'UUID
const isUUID = (str: string) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
};

export async function generateTacticalAudit(targetInput: string, userInput: string) {
  console.log(`ðŸš€ [TWINS_INTEL] Scan demandÃ© : "${userInput}" vs "${targetInput}"`);

  try {
    // -------------------------------------------------------------------------
    // 1. RECHERCHE INTELLIGENTE (ID ou NOM)
    // -------------------------------------------------------------------------

    const findProfileSmart = async (input: string, label: string) => {
      let p = null;

      // A. Essai par UUID (si le format correspond)
      if (input && isUUID(input)) {
        p = await prisma.profile.findUnique({
          where: { id: input },
          select: { id: true, name: true }
        });
      }

      // B. Essai par NOM (Si UUID Ã©choue ou si c'est un pseudo comme "user")
      if (!p && input) {
        console.log(`ðŸ” Recherche par NOM pour ${label}: "${input}"...`);
        // Recherche insensible Ã  la casse (si supportÃ©) ou exacte
        p = await prisma.profile.findFirst({
          where: { name: input }, // Cherche le profil qui s'appelle exactement comme Ã§a
          select: { id: true, name: true }
        });
      }

      // C. Fallback (Dernier recours : Premier profil dispo)
      if (!p) {
        console.warn(`âš ï¸ ${label} introuvable ("${input}"). Utilisation d'un profil par dÃ©faut.`);
        p = await prisma.profile.findFirst({ select: { id: true, name: true } });
      }

      return p || { id: "ghost", name: "EntitÃ© Inconnue" };
    };

    const agentProfile = await findProfileSmart(userInput, "AGENT");
    const targetProfile = await findProfileSmart(targetInput, "CIBLE");

    console.log(`âœ… CIBLES VERROUILLÃ‰ES : ${agentProfile.name} (Agent) vs ${targetProfile.name} (Cible)`);

    // -------------------------------------------------------------------------
    // 2. EXTRACTION DES VRAIS SOUVENIRS
    // -------------------------------------------------------------------------

    const fetchMemories = async (pid: string) => {
      if (pid === "ghost") return [];
      try {
        // On rÃ©cupÃ¨re tout (any) pour contourner le bug de typage
        const mems = await prisma.memory.findMany({
          where: { profileId: pid },
          take: 10,
          orderBy: { createdAt: 'desc' }
        }) as any[];
        return mems;
      } catch (e) {
        console.warn("Erreur lecture mÃ©moire:", e);
        return [];
      }
    };

    const agentMemories = await fetchMemories(agentProfile.id);
    // Si on scanne le mÃªme profil, on copie les donnÃ©es
    const targetMemories = (agentProfile.id === targetProfile.id)
      ? agentMemories
      : await fetchMemories(targetProfile.id);

    console.log("LONGUEUR DU TEXTE ENVOYÃ‰ Ã€ MISTRAL (Agent):", agentMemories.length);
    console.log("CONTENU (Agent):", agentMemories);
    console.log("LONGUEUR DU TEXTE ENVOYÃ‰ Ã€ MISTRAL (Cible):", targetMemories.length);
    console.log("CONTENU (Cible):", targetMemories);

    // -------------------------------------------------------------------------
    // 3. PRÃ‰PARATION IA (Mise en forme)
    // -------------------------------------------------------------------------

    const formatData = (mems: any[]) => {
      if (!mems || mems.length === 0) return "AUCUNE DONNÃ‰E MÃ‰MOIRE (Profil vide).";
      return mems.map(m => `[${m.type || 'DATA'}] ${m.content || m.text || "..."}`).join("\n");
    };

    const systemPrompt = `
      Tu es TWINS, une IA d'audit tactique.
      MISSION : Analyser les profils rÃ©els ci-dessous.
      
      RÃˆGLES :
      1. Base-toi UNIQUEMENT sur les donnÃ©es fournies ("Fragments").
      2. Si les fragments parlent de brevets/code, mentionne-le dans "Psyche" ou "Network".
      3. Style : Cyberpunk / Militaire.
      4. SORTIE : JSON STRICT.
    `;

    const userPrompt = `
      === AGENT (${agentProfile.name}) ===
      Fragments:
      ${formatData(agentMemories)}

      === CIBLE (${targetProfile.name}) ===
      Fragments:
      ${formatData(targetMemories)}

      === JSON ATTENDU ===
      {
        "identity": { "role": "Titre", "clearance": "Niveau" },
        "scores": { "match": 0-100, "reliability": 0-100, "influence": 0-100 },
        "psyche": [
          { "trait": "Trait 1", "value": 0-100, "label": "Preuve" },
          { "trait": "Trait 2", "value": 0-100, "label": "Preuve" }
        ],
        "network": ["OpportunitÃ© 1", "OpportunitÃ© 2"],
        "risks": ["Risque 1"]
      }
    `;

    // -------------------------------------------------------------------------
    // 4. ANALYSE (Mistral)
    // -------------------------------------------------------------------------

    // ðŸš¨ LE DÃ‰TECTEUR DE MENSONGE (Debug Log demandÃ©)
    console.log("ðŸ§  TEXTE ENVOYÃ‰ Ã€ MISTRAL POUR ANALYSE (User Prompt) :", userPrompt);

    if (!userPrompt || userPrompt.trim() === "") {
      console.warn("âš ï¸ ALERTE : On envoie un texte vide Ã  l'IA !");
    }

    console.log("ðŸ“¡ Envoi Ã  l'IA...");
    const chatResponse = await client.chat.complete({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.2, // Faible tempÃ©rature pour rester factuel
    });

    const raw = chatResponse.choices?.[0].message.content;
    if (!raw) throw new Error("RÃ©ponse vide");

    const auditData = JSON.parse(raw as string);

    // Force le nom correct pour l'affichage UI
    auditData.identity = {
      ...auditData.identity,
      name: targetProfile.name, // Le vrai nom de la base de donnÃ©es
      lastActive: "En ligne"
    };

    console.log("âœ… Audit gÃ©nÃ©rÃ© avec succÃ¨s sur les donnÃ©es rÃ©elles.");
    return auditData;

  } catch (error) {
    console.error("âŒ ERREUR:", error);
    return {
      identity: { name: "ERREUR", role: "Ã‰chec Scan", clearance: "N/A" },
      scores: {}, psyche: [], network: ["Profil introuvable ou erreur serveur"], risks: []
    };
  }
}
