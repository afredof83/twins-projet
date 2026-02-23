import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Mistral } from '@mistralai/mistralai';

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(req: Request) {
    try {
        const { profileId } = await req.json();

        // 1. Récupération de l'IDENTITÉ et de la MATRICE
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: {
                dateOfBirth: true, gender: true, city: true, country: true,
                thematicProfile: true
            }
        });

        if (!profile) throw new Error("Profil introuvable");

        // 2. Récupération de la MÉMOIRE (Documents/Liens)
        const memories = await prisma.memory.findMany({
            where: { profileId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        // 3. Construction du Super-Contexte pour Mistral
        const profileData = `
        - Localisation : ${profile.city || 'Inconnue'}, ${profile.country || 'Inconnu'}
        - Naissance : ${profile.dateOfBirth || 'Non renseignée'}
        - Genre : ${profile.gender || 'Non renseigné'}
        - Matrice Déclarative : ${JSON.stringify(profile.thematicProfile || {})}
        `;

        const cortexData = memories.length > 0
            ? memories.map(m => m.content).join("\n---\n")
            : "Aucun document ou lien dans le Cortex pour le moment.";

        const fullContext = `
        === IDENTITÉ & MATRICE PSYCHOLOGIQUE ===
        ${profileData}

        === MÉMOIRE DU CORTEX (Fichiers & Liens) ===
        ${cortexData}
        `;

        // 4. Cogitation du Gardien
        const response = await client.chat.complete({
            model: "mistral-small-latest",
            messages: [
                {
                    role: "system",
                    content: "Tu es le Cortex, l'IA d'analyse d'un Jumeau Numérique. Ton rôle est de faire la synthèse entre ce que l'utilisateur déclare (sa Matrice) et ce qu'il consomme/produit (sa Mémoire Cortex). Crée un profilage global et unifié (3 à 4 phrases maximum) qui cerne sa véritable identité, ses compétences, ses valeurs et ses contradictions éventuelles. Sois incisif, précis et professionnel."
                },
                {
                    role: "user",
                    content: `Analyse l'ensemble de ces données pour générer le profilage global :\n\n${fullContext}`
                }
            ]
        });

        let synthesis = "";
        const rawContent = response.choices?.[0].message.content;

        if (typeof rawContent === 'string') {
            synthesis = rawContent;
        } else if (Array.isArray(rawContent)) {
            synthesis = rawContent.map((chunk: any) => chunk.text || '').join('');
        }

        // 5. Sauvegarde
        await prisma.profile.update({
            where: { id: profileId },
            data: { unifiedAnalysis: synthesis }
        });

        return NextResponse.json({ success: true, synthesis });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
