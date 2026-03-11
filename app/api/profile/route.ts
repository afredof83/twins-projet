export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPrismaForUser, prisma } from '@/lib/prisma';
import { getMistralEmbedding } from '@/lib/mistral';

async function getAuthUser(request: Request) {
    const authHeader = request.headers.get('Authorization');
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
                set() { }, remove() { }
            }
        }
    );
    const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
    return user;
}

export async function GET(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ success: false, error: 'ID manquant' }, { status: 400 });

        const user = await getAuthUser(request);
        if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

        const prismaRLS = getPrismaForUser(user.id);
        const profile = await prismaRLS.profile.findUnique({ where: { id } });

        if (!profile) return NextResponse.json({ success: false, error: 'Profil introuvable' }, { status: 404 });
        return NextResponse.json({ success: true, profile });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const user = await getAuthUser(request);
        if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

        const prismaRLS = getPrismaForUser(user.id);
        const body = await request.json();
        const { action } = body;

        if (action === 'updateGeneralIdentity') {
            const { name, age, gender, city, country, activePrism } = body;
            const ageParsed = age ? parseInt(age, 10) : null;

            await prismaRLS.profile.update({
                where: { id: user.id },
                data: {
                    name,
                    age: ageParsed,
                    gender,
                    city,
                    country,
                    activePrism: activePrism || 'WORK'
                }
            });

            // Mise à jour de la mémoire vectorielle (pour que l'IA connaisse ton identité de base)
            const identityString = `Identité Agent Ipse: Pseudo: ${name || 'Inconnu'}. Âge: ${ageParsed || 'Inconnu'}. Sexe: ${gender || 'Non précisé'}. Localisation: ${city || 'Inconnue'}, ${country || 'Inconnu'}.`;
            const embedding = await getMistralEmbedding(identityString);

            if (embedding) {
                await prisma.$executeRawUnsafe(
                    `UPDATE public."Profile" SET "unifiedEmbedding" = $1::vector WHERE id = $2`,
                    `[${embedding.join(',')}]`,
                    user.id
                );
            }

            return NextResponse.json({ success: true });
        }

        // Garder les anciennes actions si nécessaire (Optionnel mais sécurisé)
        if (action === 'create') {
            const { name, publicKey } = body;
            
            if (!publicKey) {
                return NextResponse.json({ success: false, error: "Clé publique (publicKey) manquante ou invalide. L'onboarding a été interrompu." }, { status: 400 });
            }

            try {
                const profile = await prismaRLS.profile.upsert({
                    where: { id: user.id },
                    update: { 
                        name,
                        publicKey
                    },
                    create: { 
                        id: user.id, 
                        email: user.email!, 
                        name,
                        publicKey
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

            await prismaRLS.profile.update({
                where: { id: user.id },
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
                await prisma.$executeRawUnsafe(
                    `UPDATE public."Profile" SET "unifiedEmbedding" = $1::vector WHERE id = $2`,
                    `[${embedding.join(',')}]`,
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