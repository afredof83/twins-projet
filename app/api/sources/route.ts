/**
 * Data Sources API - Neural Link for Social Media Ingestion
 * CRITICAL: Read-only. Twin NEVER posts to real social networks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch all data sources for a profile
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

        const sources = await prisma.dataSource.findMany({
            where: { profileId },
            orderBy: { platform: 'asc' },
            select: {
                id: true,
                platform: true,
                isConnected: true,
                syncStatus: true,
                lastSync: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json({ sources });
    } catch (error: any) {
        console.error('Data sources GET error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST: Connect/activate a data source
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { profileId, platform } = body;

        // Validation
        if (!profileId || typeof profileId !== 'string') {
            return NextResponse.json(
                { error: 'profileId is required' },
                { status: 400 }
            );
        }

        if (!platform || typeof platform !== 'string') {
            return NextResponse.json(
                { error: 'platform is required' },
                { status: 400 }
            );
        }

        // Check if source already exists
        let source = await prisma.dataSource.findUnique({
            where: {
                profileId_platform: {
                    profileId,
                    platform,
                },
            },
        });

        if (source) {
            // Update existing source to SYNCING
            source = await prisma.dataSource.update({
                where: { id: source.id },
                data: {
                    syncStatus: 'SYNCING',
                },
            });
        } else {
            // Create new source
            source = await prisma.dataSource.create({
                data: {
                    profileId,
                    platform,
                    syncStatus: 'SYNCING',
                    isConnected: false,
                },
            });
        }

        console.log(`🔄 Data source ${platform} syncing for profile ${profileId}`);

        // Mock OAuth flow: Wait 2 seconds then update to CONNECTED
        setTimeout(async () => {
            try {
                await prisma.dataSource.update({
                    where: { id: source.id },
                    data: {
                        syncStatus: 'CONNECTED',
                        isConnected: true,
                        lastSync: new Date(),
                    },
                });
                console.log(`✅ Data source ${platform} connected`);
            } catch (err) {
                console.error('Error updating source after sync:', err);
            }
        }, 2000);

        return NextResponse.json({ source }, { status: 200 });
    } catch (error: any) {
        console.error('Data sources POST error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
