import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';
import { scanNetworkForAgents } from '@/lib/tools/network-scanner';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(req: Request) {
    try {
        const { profileId, sector } = await req.json();

        console.log(`📡 [SONAR] Scan hybride (Interne/Externe) pour : ${profileId}`);

        // 1. SCAN INTERNE (Ta Base de Données)
        // On cherche tous les profils SAUF toi-même
        // Note: 'username' is not in the schema provided earlier (only name, email, bio). replaced with 'name'
        const { data: internalProfiles, error: dbError } = await supabase
            .from('Profile')
            .select('id, bio, name')
            .neq('id', profileId)
            .limit(10);

        if (dbError) console.error("Erreur DB:", dbError);

        // On formate les profils internes pour l'IA
        const internalSignals = internalProfiles?.map(p => ({
            name: p.name || "Utilisateur Anonyme",
            type: "Interne (Twin User)",
            context: `Bio: ${p.bio || "Non renseignée"}. (Ceci est un autre utilisateur de la plateforme).`
        })) || [];

        // 2. SCAN EXTERNE (Simulation Web / Outil précédent)
        const externalSignalsRaw = await scanNetworkForAgents(sector);
        // Note: scanNetworkForAgents returns an object, no need to parse JSON if it's already an object
        // But checking if it returns string or object to be safe based on previous iterations
        const externalSignals = Array.isArray(externalSignalsRaw) ? externalSignalsRaw : JSON.parse(externalSignalsRaw as unknown as string);

        // 3. FUSION DES SIGNAUX
        const allSignals = [...internalSignals, ...externalSignals];

        if (allSignals.length === 0) {
            return NextResponse.json({ success: true, count: 0, agents: [] });
        }

        // 4. ANALYSE IA (Le Filtre IFF)
        // On récupère ton profil pour comparer
        const { data: myProfile } = await supabase.from('Profile').select('bio').eq('id', profileId).single();

        // On force le format JSON strict
        const analysisResponse = await mistral.chat.complete({
            model: "mistral-large-latest",
            messages: [
                {
                    role: "system",
                    content: `Tu es le Radar du projet Cortex. 
          Ta mission : Analyser la compatibilité entre l'utilisateur courant et les cibles détectées.
          
          Critères de compatibilité :
          - Complémentarité des compétences (ex: Tech vs Fabriquant).
          - Mots-clés communs (ex: Pêche, Leurre, Innovation).
          
          Si une cible est pertinente, donne un score > 70.`
                },
                {
                    role: "user",
                    content: `MON PROFIL : ${myProfile?.bio || "Expert Tech & Marine"}\n\nCIBLES DÉTECTÉES : ${JSON.stringify(allSignals)}\n\nFormat JSON attendu : { "agents": [{ "name": "...", "type": "...", "matchScore": 85, "reasoning": "..." }] }`
                }
            ],
            responseFormat: { type: "json_object" }
        });

        const content = analysisResponse.choices?.[0].message.content;
        if (!content) throw new Error("Réponse Mistral vide");

        let parsedContent;
        try {
            parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
        } catch (e) {
            console.error("Erreur parsing JSON Mistral:", content);
            throw new Error("Format JSON invalide reçu de l'IA");
        }

        const analyzedAgents = parsedContent.agents || (Array.isArray(parsedContent) ? parsedContent : []);

        if (!analyzedAgents.length && parsedContent.name) {
            analyzedAgents.push(parsedContent);
        }

        // 5. ENREGISTREMENT (Persistence)
        // On ne sauvegarde que ceux qui ont un score > 50 pour ne pas polluer la base
        const validAgents = analyzedAgents.filter((a: any) => a.matchScore > 50);

        const agentsToSave = validAgents.map((agent: any) => ({
            profileId,
            name: agent.name,
            type: agent.type,
            sector: sector,
            matchScore: agent.matchScore,
            reasoning: agent.reasoning || "Détecté par le sonar hybride.",
            status: 'DETECTED'
        }));

        if (agentsToSave.length > 0) {
            const { error } = await supabase.from('NetworkEntity').insert(agentsToSave);
            if (error) console.error("Erreur sauvegarde network:", error); // Log mais ne plante pas
        }

        return NextResponse.json({ success: true, count: validAgents.length, agents: validAgents });

    } catch (error: any) {
        console.error("❌ Erreur Sonar:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
