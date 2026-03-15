export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMistralEmbedding } from '@/lib/mistral';
import { createClientServer } from '@/lib/supabaseScoped';

export async function GET(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const { user } = await createClientServer(request);

        const profile = await prisma.profile.findFirst({
            where: id ? { id } : { userId: user.id } // Si pas d'ID, prend celui de l'user connecté
        });

        if (!profile) return NextResponse.json({ success: false, error: 'Profil introuvable' }, { status: 404 });
        return NextResponse.json({ success: true, profile });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { user } = await createClientServer(request);


        const body = await request.json();
        const { action } = body;

        if (action === 'updateGeneralIdentity') {
            const { name, age, gender, city, country, activePrism } = body;
            const ageParsed = age ? parseInt(age, 10) : null;

            const prism = activePrism || 'WORK';
            await prisma.profile.update({
                where: { userId_type: { userId: user.id, type: prism } },
                data: {
                    name,
                    age: ageParsed,
                    gender,
                    city,
                    country,
                    activePrism: prism
                }
            });

            // Mise à jour de la mémoire vectorielle (pour que l'IA connaisse ton identité de base)
            const identityString = `Identité Agent Ipse: Pseudo: ${name || 'Inconnu'}. Âge: ${ageParsed || 'Inconnu'}. Sexe: ${gender || 'Non précisé'}. Localisation: ${city || 'Inconnue'}, ${country || 'Inconnu'}.`;
            const embedding = await getMistralEmbedding(identityString);

            if (embedding) {
                const vectorString = `[${embedding.join(',')}]`;
                await prisma.$executeRawUnsafe(
                    `UPDATE "profiles" SET "unified_embedding" = $1::vector WHERE user_id = $2 AND type = $3`,
                    vectorString,
                    user.id,
                    prism
                );
            }

            return NextResponse.json({ success: true });
        }

        // Garder les anciennes actions si nécessaire (Optionnel mais sécurisé)
        if (action === 'create') {
            const { name, public_key: publicKey } = body;
            
            if (!publicKey) {
                return NextResponse.json({ success: false, error: "Clé publique (public_key) manquante ou invalide. L'onboarding a été interrompu." }, { status: 400 });
            }

            try {
                const profile = await prisma.profile.upsert({
                    where: { userId_type: { userId: user.id, type: 'WORK' } },
                    update: { 
                        name,
                        publicKey
                    },
                    create: { 
                        id: user.id, 
                        userId: user.id,
                        email: user.email!, 
                        name,
                        publicKey,
                        type: 'WORK'
                    }
                });
                
                if (publicKey) {
                    console.log(`✅ [API-PROFILE] Clé publique synchronisée pour l'utilisateur ${user.id}`);
                }
                
                return NextResponse.json({ success: true, profileId: profile.id });
            } catch (error: any) {
                console.error("❌ [API-PROFILE] Échec critique de la persistance de la clé publique:", error.message);
                throw error;
            }
        }

        if (action === 'updateIdentity') {
            const { primaryRole, customRole, tjm, availability, bio } = body;
            const tjmParsed = tjm ? parseInt(tjm, 10) : null;

            await prisma.profile.update({
                where: { userId_type: { userId: user.id, type: 'WORK' } },
                data: {
                    primaryRole,
                    customRole: primaryRole === 'OTHER' ? customRole : null,
                    tjm: tjmParsed,
                    availability,
                    bio
                }
            });

            const identityString = `Role: ${primaryRole === 'OTHER' ? customRole : primaryRole}. Bio: ${bio}. TJM: ${tjmParsed}€. Dispo: ${availability}`;
            const embedding = await getMistralEmbedding(identityString);

            if (embedding) {
                const vectorString = `[${embedding.join(',')}]`;
                await prisma.$executeRawUnsafe(
                    `UPDATE "profiles" SET "unified_embedding" = $1::vector WHERE user_id = $2 AND type = 'WORK'`,
                    vectorString,
                    user.id
                );
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: 'Action non reconnue' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}