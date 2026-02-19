'use server'

import { Mistral } from '@mistralai/mistralai';
import { prisma } from "@/lib/prisma";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// Vérificateur d'UUID
const isUUID = (str: string) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
};

export async function generateTacticalAudit(targetInput: string, userInput: string) {
  console.log(`🚀 [TWINS_INTEL] Scan demandé : "${userInput}" vs "${targetInput}"`);

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

      // B. Essai par NOM (Si UUID échoue ou si c'est un pseudo comme "user")
      if (!p && input) {
        console.log(`🔍 Recherche par NOM pour ${label}: "${input}"...`);
        // Recherche insensible à la casse (si supporté) ou exacte
        p = await prisma.profile.findFirst({
          where: { name: input }, // Cherche le profil qui s'appelle exactement comme ça
          select: { id: true, name: true }
        });
      }

      // C. Fallback (Dernier recours : Premier profil dispo)
      if (!p) {
        console.warn(`⚠️ ${label} introuvable ("${input}"). Utilisation d'un profil par défaut.`);
        p = await prisma.profile.findFirst({ select: { id: true, name: true } });
      }

      return p || { id: "ghost", name: "Entité Inconnue" };
    };

    const agentProfile = await findProfileSmart(userInput, "AGENT");
    const targetProfile = await findProfileSmart(targetInput, "CIBLE");

    console.log(`✅ CIBLES VERROUILLÉES : ${agentProfile.name} (Agent) vs ${targetProfile.name} (Cible)`);

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

    const systemPrompt = `
      Tu es TWINS, une IA d'audit tactique.
      MISSION : Analyser les profils réels ci-dessous.
      
      RÈGLES :
      1. Base-toi UNIQUEMENT sur les données fournies ("Fragments").
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
        "network": ["Opportunité 1", "Opportunité 2"],
        "risks": ["Risque 1"]
      }
    `;

    // -------------------------------------------------------------------------
    // 4. ANALYSE (Mistral)
    // -------------------------------------------------------------------------

    // 🚨 LE DÉTECTEUR DE MENSONGE (Debug Log demandé)
    console.log("🧠 TEXTE ENVOYÉ À MISTRAL POUR ANALYSE (User Prompt) :", userPrompt);

    if (!userPrompt || userPrompt.trim() === "") {
      console.warn("⚠️ ALERTE : On envoie un texte vide à l'IA !");
    }

    console.log("📡 Envoi à l'IA...");
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
    console.error("❌ ERREUR:", error);
    return {
      identity: { name: "ERREUR", role: "Échec Scan", clearance: "N/A" },
      scores: {}, psyche: [], network: ["Profil introuvable ou erreur serveur"], risks: []
    };
  }
}