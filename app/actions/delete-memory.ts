'use server';
import { createClient } from '@/lib/supabaseServer';
import { trackAgentActivity } from './missions';
import { revalidatePath } from 'next/cache';

export async function deleteMemoryFragment(memoryId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    // 1. Suppression physique
    const { error } = await supabase
        .from('memory')
        .delete()
        .eq('id', memoryId)
        .eq('profile_id', user.id);

    if (error) throw new Error(error.message);

    // 2. Mise à jour des stats (recomptage réel)
    await trackAgentActivity(user.id, 'memory_delete');

    // 3. Revalidation (seulement ici !)
    revalidatePath('/');
    revalidatePath('/memories');

    return { success: true };
}
