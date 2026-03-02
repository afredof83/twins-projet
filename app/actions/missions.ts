'use server'
import { prisma } from "@/lib/prisma";

export async function trackAgentActivity(userId: string, action: 'message' | 'memory' | 'scan' | 'memory_delete') {
    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) return;

    const stats = ((profile as any).stats) || { messages: 0, memories: 0, scans: 0 };

    if (action === 'memory' || action === 'memory_delete') {
        // VÉRITÉ ABSOLUE : On compte physiquement les lignes en base
        console.time('[PERF] memory.count');
        stats.memories = await prisma.memory.count({ where: { profileId: userId } });
        console.timeEnd('[PERF] memory.count');
    } else if (action === 'message') {
        stats.messages = (stats.messages || 0) + 1;
    } else if (action === 'scan') {
        stats.scans = (stats.scans || 0) + 1;
    }

    // Calcul du Level et mise à jour
    const totalActions = (stats.messages || 0) + (stats.memories || 0) + (stats.scans || 0);
    const newLevel = Math.floor(totalActions / 10) + 1;

    try {
        // await prisma.profile.update({
        //     where: { id: userId },
        //     data: { stats, syncLevel: newLevel }
        // });
    } catch (err) {
        console.error('[MISSIONS] Échec mise à jour profil :', err);
    }
}
