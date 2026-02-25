'use server';
import { createClient } from '@/lib/supabaseServer';
import { mistralClient } from '@/lib/mistral';
import { revalidatePath } from 'next/cache';

export async function updateMemoryAndVector(memoryId: string, newContent: string) {
    const supabase = await createClient();

    // 1. Vérification stricte de l'authentification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('[SÉCURITÉ] Accès refusé. Utilisateur non authentifié.');

    try {
        // 2. Re-vectorisation via Mistral
        const embedResponse = await mistralClient.embeddings.create({
            model: 'mistral-embed',
            inputs: [newContent]
        });

        const newVector = embedResponse.data[0].embedding;

        // 3. Mise à jour transactionnelle dans Supabase
        const { error } = await supabase
            .from('memory')
            .update({
                content: newContent,
                embedding: newVector
            })
            .eq('id', memoryId);

        if (error) throw new Error(error.message);

        revalidatePath('/memories');
        return { success: true };
    } catch (error: any) {
        console.error('[CRITIQUE] Échec de la mise à jour mémoire :', error);
        return { success: false, error: error.message };
    }
}
