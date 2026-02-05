/**
 * Shadow Feed API Route - Autonomous Clone Network Activity
 * Simulates the clone's interactions in a parallel network
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch shadow interactions
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const profileId = searchParams.get('profileId');
        const limit = parseInt(searchParams.get('limit') || '20');

        if (!profileId) {
            return NextResponse.json(
                { error: 'profileId is required' },
                { status: 400 }
            );
        }

        // Fetch real interactions from database
        const interactions = await prisma.shadowInteraction.findMany({
            where: { profileId },
            orderBy: { timestamp: 'desc' },
            take: limit,
            select: {
                id: true,
                targetProfileId: true,
                compatibilityScore: true,
                status: true,
                metadata: true,
                timestamp: true,
            },
        });

        // If no interactions exist, generate mock data for V1
        if (interactions.length === 0) {
            const mockInteractions = generateMockInteractions(profileId);
            return NextResponse.json({
                interactions: mockInteractions,
                mode: 'mock'
            });
        }

        return NextResponse.json({
            interactions,
            mode: 'live'
        });
    } catch (error: any) {
        console.error('Shadow feed GET error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST: Create a shadow interaction (for testing/simulation)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { profileId, targetProfileId, compatibilityScore, status, metadata } = body;

        if (!profileId || !targetProfileId) {
            return NextResponse.json(
                { error: 'profileId and targetProfileId are required' },
                { status: 400 }
            );
        }

        const interaction = await prisma.shadowInteraction.create({
            data: {
                profileId,
                targetProfileId,
                compatibilityScore: compatibilityScore || 0.0,
                status: status || 'IGNORED',
                metadata: metadata ? JSON.stringify(metadata) : '{}',
            },
        });

        return NextResponse.json({ interaction }, { status: 201 });
    } catch (error: any) {
        console.error('Shadow feed POST error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Generate realistic mock shadow interactions for V1
 */
function generateMockInteractions(profileId: string) {
    const now = new Date();
    const actions = [
        { action: 'SCAN_INIT', message: 'Initialisation du scan réseau...', score: null, status: null },
        { action: 'PROFILE_FOUND', message: 'Profil détecté: ID #8821', score: 0.87, status: 'ESCALATED' },
        { action: 'ANALYSIS', message: 'Analyse vectorielle en cours...', score: null, status: null },
        { action: 'PROFILE_FOUND', message: 'Profil détecté: ID #9923', score: 0.34, status: 'IGNORED' },
        { action: 'PROFILE_FOUND', message: 'Profil détecté: ID #7654', score: 0.92, status: 'MATCHED' },
        { action: 'SCAN_COMPLETE', message: 'Scan terminé. 3 profils analysés.', score: null, status: null },
        { action: 'PROFILE_FOUND', message: 'Profil détecté: ID #5432', score: 0.45, status: 'IGNORED' },
        { action: 'COMPATIBILITY_CHECK', message: 'Vérification de compatibilité...', score: null, status: null },
        { action: 'PROFILE_FOUND', message: 'Profil détecté: ID #3210', score: 0.78, status: 'ESCALATED' },
        { action: 'NETWORK_IDLE', message: 'Réseau en veille. Prochaine analyse dans 5min.', score: null, status: null },
    ];

    return actions.map((action, index) => {
        const timestamp = new Date(now.getTime() - (actions.length - index) * 30000); // 30s intervals

        return {
            id: `mock_${index}`,
            targetProfileId: action.score ? `#${Math.floor(Math.random() * 10000)}` : null,
            compatibilityScore: action.score,
            status: action.status,
            metadata: JSON.stringify({
                action: action.action,
                message: action.message,
                timestamp: timestamp.toISOString(),
            }),
            timestamp: timestamp.toISOString(),
        };
    });
}
