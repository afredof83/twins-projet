/**
 * Memory API Route
 * Handles encrypted memory storage and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET - Fetch all memories for a profile
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const profileId = searchParams.get('profileId');

        if (!profileId) {
            return NextResponse.json(
                { error: 'profileId is required' },
                { status: 400 }
            );
        }

        // Fetch all memories for this profile
        const memories = await prisma.memory.findMany({
            where: { profileId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                encryptedContent: true,
                encryptedMetadata: true,
                type: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json({ memories });
    } catch (error: any) {
        console.error('Error fetching memories:', error);
        return NextResponse.json(
            { error: 'Failed to fetch memories' },
            { status: 500 }
        );
    }
}

/**
 * POST - Create a new memory
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { profileId, encryptedContent, encryptedMetadata, type } = body;

        // Validation
        if (!profileId || typeof profileId !== 'string') {
            return NextResponse.json(
                { error: 'profileId is required' },
                { status: 400 }
            );
        }

        if (!encryptedContent || typeof encryptedContent !== 'string') {
            return NextResponse.json(
                { error: 'encryptedContent is required' },
                { status: 400 }
            );
        }

        // Verify profile exists
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
        });

        if (!profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            );
        }

        // Create memory with encrypted data
        // Note: embedding is null for now, will be added later
        const memory = await prisma.memory.create({
            data: {
                profileId,
                encryptedContent,
                encryptedMetadata: encryptedMetadata || '{}',
                type: type || 'TEXT',
                // embedding will be generated in a future update
            },
            select: {
                id: true,
                encryptedContent: true,
                encryptedMetadata: true,
                type: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        console.log(`✅ Memory created: ${memory.id} for profile ${profileId}`);

        return NextResponse.json({
            success: true,
            memory,
        });
    } catch (error: any) {
        console.error('Error creating memory:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create memory' },
            { status: 500 }
        );
    }
}
