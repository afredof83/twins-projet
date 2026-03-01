'use server';
import { mistralClient } from '@/lib/mistral';
import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { trackAgentActivity } from '@/app/actions/missions';
import { prisma } from '@/lib/prisma';

export async function syncWebDataToCortex(title: string, url: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('[SÉCURITÉ] Accès refusé.');

    try {
        const formattedContent = `[ÉCLAIREUR WEB] Titre: ${title}\nSource: ${url}\nExtrait: ${content}`;

        // Vectorisation
        const embRes = await mistralClient.embeddings.create({
            model: 'mistral-embed',
            inputs: [formattedContent]
        });

        // Insertion
        const { error } = await supabase.from('memory').insert({
            id: crypto.randomUUID(),
            profile_id: user.id,
            content: formattedContent,
            type: 'knowledge',
            source: 'tavily_manual_sync',
            embedding: embRes.data[0].embedding
        });

        if (error) throw new Error(error.message);

        await trackAgentActivity(user.id, 'memory');

        const updatedProfile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { name: true, role: true }
        });

        revalidatePath('/memories');
        revalidatePath('/');
        return { success: true, newStats: updatedProfile };
    } catch (error: any) {
        console.error('[CRITIQUE] Échec de synchronisation Cortex :', error);
        return { success: false, error: error.message };
    }
}
