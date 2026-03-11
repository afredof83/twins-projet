export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Radar CRON API Route - Optimized Refactoring
 * Focus: High-performance vector matching (O(N log N)) without expensive Mistral AI calls.
 */
export async function GET(req: NextRequest) {
    // 1. Security Check
    const authHeader = req.headers.get('Authorization');
    const secret = process.env.CRON_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
        console.error("🚨 [CRON-RADAR] Unauthorized access blocked.");
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Theme Selection & Embedding Mapping
    const theme = req.nextUrl.searchParams.get('theme') || 'work';
    const embeddingField = theme === 'dating' ? 'social_embedding' : (theme === 'hobby' ? 'hobby_embedding' : 'unifiedEmbedding');

    console.log(`🚀 [CRON-RADAR] Strategic scan START | Theme: ${theme} | Field: ${embeddingField}`);

    try {
        // 3. Optimized Vector Cross-Matching
        // Find all pairs (p1, p2) with similarity > 0.8 that don't already have an opportunity record.
        // Similarity formula: 1 - (vector_distance)
        const newMatches: any[] = await prisma.$queryRawUnsafe(`
            SELECT 
                p1.id as "sourceId",
                p2.id as "targetId",
                1 - (p1."${embeddingField}" <=> p2."${embeddingField}") as similarity
            FROM "Profile" p1
            JOIN "Profile" p2 ON p1.id < p2.id
            WHERE p1."${embeddingField}" IS NOT NULL
            AND p2."${embeddingField}" IS NOT NULL
            AND 1 - (p1."${embeddingField}" <=> p2."${embeddingField}") > 0.8
            AND NOT EXISTS (
                SELECT 1 FROM "Opportunity" o 
                WHERE (o."sourceId" = p1.id AND o."targetId" = p2.id)
                OR (o."sourceId" = p2.id AND o."targetId" = p1.id)
            )
            LIMIT 250;
        `);

        if (newMatches.length === 0) {
            return NextResponse.json({ success: true, message: "No new opportunities found.", created: 0 });
        }

        // 4. Batch Preparing & Insertion
        const opportunitiesData = newMatches.map(m => ({
            sourceId: m.sourceId,
            targetId: m.targetId,
            matchScore: Math.round(m.similarity * 100),
            synergies: "Synergie sémantique détectée par le Radar (Auto-Detection).",
            status: 'DETECTED',
            audit: null,
            title: `Opportunité ${theme.toUpperCase()}`
        }));

        // Efficient batch insert to minimize DB roundtrips
        const result = await prisma.opportunity.createMany({
            data: opportunitiesData,
            skipDuplicates: true
        });

        console.log(`✅ [CRON-RADAR] Strategic scan COMPLETE | New opportunities: ${result.count}`);

        return NextResponse.json({
            success: true,
            created: result.count,
            found: newMatches.length,
            theme
        });

    } catch (error: any) {
        console.error("🔥 [CRON-RADAR] Critical Failure:", error.message);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
