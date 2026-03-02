'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

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

        console.log(`[IDENTITÉ] Profil de ${user.id} sauvegardé.`);
        revalidatePath('/profile');

    } catch (error) {
        console.error("[IDENTITÉ] Erreur BDD:", error);
        throw new Error("Erreur lors de la sauvegarde.");
    }
}
