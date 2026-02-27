'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'

const prisma = new PrismaClient()

export async function deleteMemory(formData: FormData) {
    const fileId = formData.get('fileId') as string;
    const fileUrl = formData.get('fileUrl') as string;

    if (!fileId || !fileUrl) return;

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");

    try {
        // 1. Suppression physique du fichier dans le Storage Supabase
        const { error: storageError } = await supabase.storage.from('cortex_files').remove([fileUrl]);
        if (storageError) {
            console.error("[DELETE] Erreur Storage:", storageError);
        }

        // 2. Suppression de la trace dans la base de données Prisma
        // (Le "profileId: user.id" est notre sécurité Zero-Trust : on s'assure qu'il supprime bien SON fichier)
        await prisma.fileArchive.delete({
            where: {
                id: fileId,
                profileId: user.id
            }
        });

        console.log(`[DELETE] Mémoire ${fileId} purgée avec succès.`);

        // 3. Rafraîchissement automatique des données à l'écran
        revalidatePath('/cortex');
        revalidatePath('/dashboard');

    } catch (error) {
        console.error("[DELETE] Erreur critique lors de la suppression:", error);
    }
}

export async function deleteNote(formData: FormData) {
    const noteId = formData.get('noteId') as string;

    if (!noteId) return;

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");

    try {
        // Suppression de la note IA (avec vérification de propriété)
        await prisma.cortexNote.delete({
            where: {
                id: noteId,
                profileId: user.id
            }
        });

        console.log(`[DELETE] Note IA ${noteId} effacée de la mémoire.`);

        // Rafraîchissement de l'interface
        revalidatePath('/cortex');

    } catch (error) {
        console.error("[DELETE] Erreur lors de la suppression de la note:", error);
    }
}
