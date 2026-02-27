import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import prisma from '@/lib/prisma';

export async function GET() {
    try {
        // 1. Authentification
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return cookieStore.getAll() } } }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

        // 2. Fetch du profil
        const profile = await prisma.profile.findUnique({
            where: { id: user.id }
        });

        if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

        // 3. Détection des lacunes (Gaps) simples
        let missingField: 'role' | 'tjm' | 'bio' | null = null;
        let gapContext = "";

        if (!profile.role) {
            missingField = 'role';
            gapContext = "Le domaine d'activité ou le métier est manquant.";
        } else if (!profile.tjm) {
            missingField = 'tjm';
            gapContext = "La prétention salariale ou tarifaire (TJM) n'est pas définie.";
        } else if (!profile.bio || profile.bio.length < 20) {
            missingField = 'bio';
            gapContext = "La bio/les aspirations sont trop courtes ou absentes.";
        }

        // S'il n'y a pas de gap vital, on peut aussi interroger Mistral pour chercher des incohérences
        // Mais pour l'instant, faisons basique :
        let contextMessage = "";

        if (missingField) {
            contextMessage = `Le profil a la lacune suivante : ${gapContext}.`;
        } else {
            return NextResponse.json({ question: null, field: null }); // Pas de question pour le moment si complet
        }

        // 4. Appel à Mistral pour générer la question
        const analysis = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: 'mistral-small-latest',
                messages: [
                    {
                        role: 'system',
                        content: `En tant qu'Agent de carrière universel, identifie les informations manquantes dans le profil de cet utilisateur (quel que soit son métier) pour l'aider à trouver des opportunités. Voici son contexte : ${contextMessage}
                        Génère UNE SEULE question directe, très courte et bien formulée à lui poser pour affiner ton ciblage par rapport à cette lacune. Commence directement ta question, ne dis pas "Bonjour".`
                    },
                ]
            })
        });

        const res = await analysis.json();

        if (!res.choices || res.choices.length === 0) {
            return NextResponse.json({ question: null, field: null }); // Pas de question pour le moment
        }

        const question = res.choices[0].message.content.replace(/^["']|["']$/g, ''); // Nettoyer les guillemets

        return NextResponse.json({ question, field: missingField });

    } catch (error) {
        console.error("[GAP ANALYSIS ERROR]", error);
        return NextResponse.json({ error: "Échec de l'analyse" }, { status: 500 });
    }
}
