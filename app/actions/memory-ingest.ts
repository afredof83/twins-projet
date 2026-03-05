'use server';

import prisma from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';
import { revalidatePath } from 'next/cache';

// 1. GET MEMORIES
export async function getMemories(profileId: string) {
    try {
        if (!profileId) throw new Error("Missing ID");
        const memories = await prisma.memory.findMany({
            where: { profileId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return { success: true, memories };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 2. ADD MEMORY
export async function addMemory(data: { profileId: string, content: string, type?: string, source?: string }) {
    try {
        const { profileId, content, type = 'thought', source = 'manual' } = data;
        const memory = await prisma.memory.create({
            data: { profileId, content, type, source }
        });
        revalidatePath('/memories');
        return { success: true, memory };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 3. SCRAPE URL (Tavily replacing basic fetch)
export async function scrapeUrl(url: string, profileId: string) {
    try {
        if (!url || !profileId) throw new Error("Missing data");
        const response = await fetch('https://api.tavily.com/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: process.env.TAVILY_API_KEY,
                urls: [url]
            })
        });

        if (!response.ok) throw new Error("Erreur extraction URL");

        const data = await response.json();
        const content = data?.results?.[0]?.rawContent || "Aucun contenu";

        const memory = await prisma.memory.create({
            data: { profileId, content: `[EXTRACTION ${url}] ${content.substring(0, 1000)}`, type: 'scraped', source: url }
        });

        revalidatePath('/memories');
        return { success: true, content, memory };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 4. UPLOAD MEMORY FORMAT (Text-only, PDF extraction done client-side)
export async function uploadMemory(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        const profileId = formData.get('profileId') as string;
        if (!file || !profileId) throw new Error("Fichier ou ID manquant");

        const text = await file.text();
        const sanitizedText = text.replace(/\0/g, '');

        const memory = await prisma.memory.create({
            data: {
                profileId,
                content: `[FICHIER: ${file.name}]\n\n${sanitizedText}`,
                type: 'document',
                source: file.name
            }
        });

        revalidatePath('/memories');
        return { success: true, memory };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 5. CORTEX INGEST (Full profile sync)
export async function ingestKnowledge(profileId: string) {
    try {
        if (!profileId) throw new Error("Missing Profile ID");

        const memories = await prisma.memory.findMany({ where: { profileId } });
        const combined = memories.map(m => m.content).join('\n');

        const prompt = `Fais une synthèse de ces mémoires en un profil cohérent:\n${combined}`;
        const res = await mistralClient.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }]
        });

        const synthesis = res.choices?.[0]?.message.content as string;
        await prisma.profile.update({
            where: { id: profileId },
            data: { bio: synthesis }
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 6. UPLOAD CORTEX MEMORY (Serveur Allégé)
export async function uploadCortexMemoryContext(formData: FormData) {
    try {
        const { cookies } = await import('next/headers');
        const { createServerClient } = await import('@supabase/ssr');
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return cookieStore.getAll() } } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Non autorisé");

        // ⚡ ANTIGRAVITY: On réceptionne uniquement du texte
        let content = formData.get('textContext') as string || '';
        const fileName = formData.get('fileName') as string || 'manual';
        const hasFile = formData.get('hasFile') === 'true';

        content = content.replace(/\0/g, ''); // Fix Null Byte Postgres indispensable

        if (!content) throw new Error("Aucun contenu valide généré.");

        const memory = await prisma.memory.create({
            data: {
                profileId: user.id,
                content: content,
                type: hasFile ? 'document' : 'thought',
                source: fileName
            }
        });

        revalidatePath('/memories');
        revalidatePath('/cortex');
        return { success: true, memory };
    } catch (error: any) {
        console.error("❌ [INGESTION ERREUR]:", error.message);
        return { success: false, error: error.message };
    }
}
