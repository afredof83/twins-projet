// lib/oracle/alchemy.ts

// 1. DÉFINITION DES OUTILS (Ce que l'IA voit)
export const ALCHEMIST_TOOLS = [
    {
        type: "function",
        function: {
            name: "simulate_future_career",
            description: "Projette l'avenir professionnel de Frédéric sur 1 à 5 ans. Calcule le salaire potentiel, le risque de burnout et la pertinence du marché.",
            parameters: {
                type: "object",
                properties: {
                    path_name: {
                        type: "string",
                        description: "La voie envisagée (ex: 'Rester chez Qualitat', 'Freelance Drone', 'Expert Nucléaire')"
                    },
                    timeframe_years: {
                        type: "integer",
                        description: "Horizon de temps en années (1 à 10)."
                    },
                    risk_tolerance: {
                        type: "string",
                        enum: ["low", "medium", "high"],
                        description: "Niveau de risque accepté."
                    }
                },
                required: ["path_name", "timeframe_years", "risk_tolerance"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "analyze_market_trend",
            description: "Analyse la demande actuelle du marché pour une compétence spécifique dans le Var (83) ou en France.",
            parameters: {
                type: "object",
                properties: {
                    skill: { type: "string", description: "La compétence ou le métier (ex: 'Amiante', 'Logistique', 'IA')" },
                    location: { type: "string", description: "Zone géographique" }
                },
                required: ["skill"]
            }
        }
    }
];

// 2. EXÉCUTION DES OUTILS (Ce que le code fait réellement)
export async function executeAlchemyTool(toolName: string, args: any) {
    console.log(`⚗️ [ALCHIMISTE] Activation de l'outil : ${toolName}`, args);

    if (toolName === "simulate_future_career") {
        // SIMULATION MATHÉMATIQUE
        const baseIncome = 32000; // Revenu de base fictif ou réel
        const growthRate = args.risk_tolerance === 'high' ? 1.25 : 1.05; // 25% vs 5% croissance
        const futureIncome = Math.round(baseIncome * Math.pow(growthRate, args.timeframe_years));

        const successProb = args.risk_tolerance === 'high' ? "45% (Risqué mais rentable)" : "92% (Sécurisé)";

        return JSON.stringify({
            scénario: args.path_name,
            horizon: `${args.timeframe_years} ans`,
            revenu_projeté: `${futureIncome} € / an`,
            probabilité_succès: successProb,
            conseil_oracle: args.risk_tolerance === 'high'
                ? "Cette voie demande une résilience extrême. Prépare un filet de sécurité."
                : "C'est la voie de la sagesse, mais attention à l'ennui."
        });
    }

    if (toolName === "analyze_market_trend") {
        // Ici on pourrait appeler une vraie API (Google Trends, LinkedIn), on simule pour l'instant
        const isHot = ["IA", "Drone", "Nucléaire", "Logistique"].some(k => args.skill.includes(k));

        return JSON.stringify({
            compétence: args.skill,
            demande: isHot ? "EXPLOSIVE (+40% sur 6 mois)" : "STAGNANTE (-2%)",
            concurrents_locaux: Math.floor(Math.random() * 100),
            verdict: isHot ? "C'est le moment d'investir massivement." : "Attention, océan rouge."
        });
    }

    return "Outil inconnu ou cassé.";
}