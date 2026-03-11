export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';
import { getPrismaForUser, prisma } from '@/lib/prisma';

// 1. Initialisation du Client Mistral (Senior Backend Standard)
const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY || '',
});

/**
 * Senior Production API - Profile Work Module (The Fortress)
 * Handles strict JWT authentication and real-time AI Vectorization (Mistral 1024d)
 */
export async function PATCH(req: Request) {
    try {
        // 2. Extraction stricte du Bearer Token (Mobile-First)
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid Bearer token' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];

        // 3. Validation Supabase
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 4. Validation du Payload (Hard Filters)
        const body = await req.json();
        const { sector, primaryRole, tjm, availability, bio, activePrism } = body;

        if (!primaryRole || !availability) {
            return NextResponse.json({ error: 'Hard filters missing (Role/Availability)' }, { status: 400 });
        }

        const prismaRLS = getPrismaForUser(user.id);
        const tjmValue = typeof tjm === 'number' ? tjm : parseInt(tjm, 10) || 0;

        // 5. Étape A : Mise à jour des données classiques (Prisma)
        await prismaRLS.profile.update({
            where: { id: user.id },
            data: {
                sector,
                primaryRole,
                tjm: tjmValue,
                availability,
                bio,
                activePrism: activePrism || 'WORK'
            }
        });

        // 6. Étape B : Vectorisation Mistral (pgvector 1024d)
        let vectorized = false;
        if (bio && bio.trim().length > 10) {
            try {
                // Appel au modèle mistral-embed (Optimisé pour RAG)
                const embeddingResponse = await mistral.embeddings.create({
                    model: 'mistral-embed',
                    inputs: [bio],
                });

                const vector = embeddingResponse.data[0].embedding;

                if (vector && vector.length === 1024) {
                    // Injection SQL brute sécurisée pour le type 'vector' de pgvector
                    // On utilise format standard [x,y,z] pour pgvector
                    const vectorString = `[${vector.join(',')}]`;

                    await prisma.$executeRaw`
                        UPDATE "Profile" 
                        SET "bioEmbedding" = ${vectorString}::vector 
                        WHERE id = ${user.id}
                    `;
                    vectorized = true;
                }
            } catch (iaError) {
                // L'IA est optionnelle : on ne bloque pas l'expérience utilisateur si Mistral est offline
                console.error('[MISTRAL_AI_ERROR] Vectorization skipped:', iaError);
            }
        }

        return NextResponse.json({
            success: true,
            vectorized,
            message: vectorized ? 'Profil synchronisé et vectorisé' : 'Profil synchronisé (Vecteur ignoré ou erreur AI)'
        });

    } catch (error: any) {
        console.error('[WORK_PROFILE_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
export const POST = PATCH;
