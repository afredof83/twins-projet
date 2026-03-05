'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getMistralEmbedding } from '@/lib/mistral';

import prisma from '@/lib/prisma';

export async function getProfile(id: string) {
    try {
        const profile = await prisma.profile.findUnique({
            where: { id }
        });
        if (!profile) return { success: false, error: 'Profil introuvable' };
        return { success: true, profile };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function createProfile(data: { name: string }) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return cookieStore.getAll() } } }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Utilisateur non authentifié' };
        }

        const profile = await prisma.profile.upsert({
            where: { id: user.id },
            update: {
                name: data.name,
            },
            create: {
                id: user.id,
                email: user.email!,
                name: data.name,
            }
        });

        return { success: true, profileId: profile.id };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function updateIdentity(formData: FormData) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");

    // Extraction sécurisée des données
    const role = formData.get('role') as string;
    const customRole = formData.get('customRole') as string;
    const tjmString = formData.get('tjm') as string;
    const availability = formData.get('availability') as string;
    const bio = formData.get('bio') as string;

    const tjm = tjmString ? parseInt(tjmString, 10) : null;

    try {
        // 1. Mise à jour des champs standards
        await prisma.profile.update({
            where: { id: user.id },
            data: {
                role,
                customRole: role === 'autre' ? customRole : null,
                tjm,
                availability,
                bio
            }
        });

        // 2. ⚡ GÉNÉRATION DU VECTEUR MAÎTRE (Unified Embedding)
        // On combine les infos clés pour une recherche vectorielle précise
        const identityString = `Role: ${role === 'autre' ? customRole : role}. Bio: ${bio}. TJM: ${tjm}€. Dispo: ${availability}`;

        console.log(`[IDENTITÉ] Génération d'embedding pour ${user.id}...`);

        const embedding = await getMistralEmbedding(identityString);

        if (embedding) {
            // Prisma ne supporte pas nativement le type 'vector', on passe en SQL brut
            // On s'assure que l'ID est bien formaté pour PostgreSQL
            await prisma.$executeRawUnsafe(
                `UPDATE "Profile" SET "unifiedEmbedding" = $1::vector WHERE id = $2`,
                `[${embedding.join(',')}]`,
                user.id
            );
            console.log(`✅ [IDENTITÉ] Vecteur Maître mis à jour.`);
        } else {
            console.error("[IDENTITÉ] Échec de génération d'embedding Mistral.");
        }

        console.log(`[IDENTITÉ] Profil de ${user.id} sauvegardé.`);
        revalidatePath('/profile');

    } catch (error) {
        console.error("[IDENTITÉ] Erreur BDD/IA:", error);
        throw new Error("Erreur lors de la sauvegarde.");
    }
}
