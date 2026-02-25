'use server'
import { mistralClient } from "@/lib/mistral";

import { prisma } from "@/lib/prisma";

const client = mistralClient;

// Vérificateur d'UUID
const isUUID = (str: string) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
};

export async function generateTacticalAudit(targetInput: string, userInput: string) {
  console.log(`ðŸš€ [TWINS_INTEL] Scan demandé : "${userInput}" vs "${targetInput}"`);

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
          select: { id: true, name: true, unifiedAnalysis: true, dateOfBirth: true, gender: true, thematicProfile: true }
        });
      }

      // B. Essai par NOM (Si UUID échoue ou si c'est un pseudo comme "user")
      if (!p && input) {
        console.log(`ðŸ” Recherche par NOM pour ${label}: "${input}"...`);
        // Recherche insensible à la casse (si supporté) ou exacte
        p = await prisma.profile.findFirst({
          where: { name: input }, // Cherche le profil qui s'appelle exactement comme ça
          select: { id: true, name: true, unifiedAnalysis: true, dateOfBirth: true, gender: true, thematicProfile: true }
        });
      }

      // C. Fallback (Dernier recours : Premier profil dispo)
      if (!p) {
        console.warn(`⚠️ ${label} introuvable ("${input}"). Utilisation d'un profil par défaut.`);
        p = await prisma.profile.findFirst({ select: { id: true, name: true, unifiedAnalysis: true, dateOfBirth: true, gender: true, thematicProfile: true } });
      }

      return p || { id: "ghost", name: "Entité Inconnue", dateOfBirth: null, gender: null, thematicProfile: null, unifiedAnalysis: null };
    };

    const agentProfile = await findProfileSmart(userInput, "AGENT");
    const targetProfile = await findProfileSmart(targetInput, "CIBLE");

    console.log(`✅ CIBLES VERROUILLÉES : ${agentProfile.name} (Agent) vs ${targetProfile.name} (Cible)`);

    // Sécurisation de la matrice JSON de l'Agent
    const agentMatrice = (agentProfile.thematicProfile as any) || {};

    // -------------------------------------------------------------------------
    // 2. EXTRACTION DES VRAIS SOUVENIRS
    // -------------------------------------------------------------------------

    const fetchMemories = async (pid: string) => {
      if (pid === "ghost") return [];
      try {
        // On récupère tout (any) pour contourner le bug de typage
        const mems = await prisma.memory.findMany({
          where: { profileId: pid },
          take: 10,
          orderBy: { createdAt: 'desc' }
        }) as any[];
        return mems;
      } catch (e) {
        console.warn("Erreur lecture mémoire:", e);
        return [];
      }
    };

    const agentMemories = await fetchMemories(agentProfile.id);
    // Si on scanne le même profil, on copie les données
    const targetMemories = (agentProfile.id === targetProfile.id)
      ? agentMemories
      : await fetchMemories(targetProfile.id);

    console.log("LONGUEUR DU TEXTE ENVOYÉ À MISTRAL (Agent):", agentMemories.length);
    console.log("CONTENU (Agent):", agentMemories);
    console.log("LONGUEUR DU TEXTE ENVOYÉ À MISTRAL (Cible):", targetMemories.length);
    console.log("CONTENU (Cible):", targetMemories);

    // -------------------------------------------------------------------------
    // 3. PRÉPARATION IA (Mise en forme)
    // -------------------------------------------------------------------------

    const formatData = (mems: any[]) => {
      if (!mems || mems.length === 0) return "AUCUNE DONNÉE MÉMOIRE (Profil vide).";
      return mems.map(m => `[${m.type || 'DATA'}] ${m.content || m.text || "..."}`).join("\n");
    };

    const systemPrompt = `Tu es TWINS, un profiler tactique impitoyable de l'Agence.
Ta mission est d'évaluer la compatibilité absolue entre notre Agent IA (le Client) et une Cible interceptée sur le réseau.
Base-toi sur l'ADN de l'Agent, le profil de la Cible et leurs fragments de mémoire récents.

RÈGLES :
1. Tu dois réaliser un AUDIT PROFOND strict, structuré et froid.
2. Identifie sur quoi les deux profils s'accordent (Favorable).
3. Identifie les points de friction / dangers (Où cela risque de bloquer).
4. Suggère une stratégie d'approche (Comment notre Agent doit se comporter).
5. Style : Cyberpunk / Militaire. Sans politesse, droit au but.
6. SORTIE OBLIGATOIRE : FORMAT JSON STRICT.
`;

    const userPrompt = `
=== 🟦 ADN DE NOTRE AGENT IA ===
- Nom de code : ${agentProfile.name}
- Âge/Genre : ${agentProfile.dateOfBirth || 'X'} ans, ${agentProfile.gender || 'Non spécifié'}
- Profil Pro : ${JSON.stringify(agentMatrice?.travail || 'Inconnu')}
- Profil Relationnel : ${JSON.stringify(agentMatrice?.rencontre || 'Inconnu')}
- Profil Loisirs : ${JSON.stringify(agentMatrice?.loisirs || 'Inconnu')}
- Fragments Mémoire:
${formatData(agentMemories)}

=== 🟥 DONNÉES SUR LA CIBLE ===
- Identité : ${targetProfile.name}
- Profil psychologique connu : ${targetProfile.unifiedAnalysis || 'Aucune donnée préalable.'}
- Fragments Mémoire:
${formatData(targetMemories)}

=== STRUCTURE JSON ATTENDUE ===
{
  "identity": { "role": "Rôle / Fonction estimée de la Cible", "clearance": "Niveau Cyberpunk (ex: LEVEL 4)" },
  "scores": { "match": 0-100, "reliability": 0-100, "influence": 0-100 },
  "psyche": [
    { "trait": "Trait Psychologique Dominant 1", "value": 0-100, "label": "Justification de cet accord/désaccord" },
    { "trait": "Trait Psychologique Dominant 2", "value": 0-100, "label": "Justification" }
  ],
  "network": [
    "Stratégie d'approche 1 : Comment l'Agent doit l'aborder",
    "Point d'accord identifié entre l'Agent et la Cible"
  ],
  "risks": [
    "Friction 1 : Point de blocage potentiel majeur",
    "Danger : Avertissement tactique"
  ]
}
    `;

    // -------------------------------------------------------------------------
    // 4. ANALYSE (Mistral)
    // -------------------------------------------------------------------------

    // ðŸš¨ LE DÉTECTEUR DE MENSONGE (Debug Log demandé)
    console.log("🧠 TEXTE ENVOYÉ À MISTRAL POUR ANALYSE (User Prompt) :", userPrompt);

    if (!userPrompt || userPrompt.trim() === "") {
      console.warn("⚠️ ALERTE : On envoie un texte vide à l'IA !");
    }

    console.log("ðŸ“¡ Envoi à l'IA...");
    const chatResponse = await client.chat.complete({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.2, // Faible température pour rester factuel
    });

    const raw = chatResponse.choices?.[0].message.content;
    if (!raw) throw new Error("Réponse vide");

    const auditData = JSON.parse(raw as string);

    // Force le nom correct pour l'affichage UI
    auditData.identity = {
      ...auditData.identity,
      name: targetProfile.name, // Le vrai nom de la base de données
      lastActive: "En ligne"
    };

    console.log("✅ Audit généré avec succès sur les données réelles.");
    return auditData;

  } catch (error) {
    console.error("âŒ ERREUR:", error);
    return {
      identity: { name: "ERREUR", role: "Échec Scan", clearance: "N/A" },
      scores: {}, psyche: [], network: ["Profil introuvable ou erreur serveur"], risks: []
    };
  }
}
