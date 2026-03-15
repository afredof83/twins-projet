export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';
import { prisma } from '@/lib/prisma';

// 1. Initialisation du Client Mistral
const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY || '',
});

/**
 * Hobby Prism API - Profile Hobby Module
 * Handles JWT authentication and real-time AI Vectorization for Hobbies.
 */
export async function PATCH(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid Bearer token' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { sector, role, bio, activePrism } = body;



        // 5. Étape A : Mise à jour des données classiques
        await prisma.profile.update({
            where: { userId_type: { userId: user.id, type: 'HOBBY' } },
            data: {
                sector: sector,
                primaryRole: role,
                bio: bio,
                activePrism: activePrism || 'HOBBY'
            }
        });

        // 6. Étape B : Vectorisation Mistral
        let vectorized = false;
        if (bio && bio.trim().length > 10) {
            try {
                const embeddingResponse = await mistral.embeddings.create({
                    model: 'mistral-embed',
                    inputs: [bio],
                });

                const vector = embeddingResponse.data[0].embedding;

                if (vector && vector.length === 1024) {
                    const vectorString = `[${vector.join(',')}]`;

                    await prisma.$executeRawUnsafe(
                        `UPDATE "profiles" SET "bio_embedding" = $1::vector WHERE user_id = $2 AND type = 'HOBBY'`,
                        vectorString,
                        user.id
                    );
                    vectorized = true;
                }
            } catch (iaError) {
                console.error('[MISTRAL_HOBBY_ERROR] Vectorization skipped:', iaError);
            }
        }

        return NextResponse.json({
            success: true,
            vectorized,
            message: 'Profil Hobbies synchronisé'
        });

    } catch (error: any) {
        console.error('[HOBBY_PROFILE_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
export const POST = PATCH;
