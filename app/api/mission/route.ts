/**
 * Mission API Route - Autonomous Agent Task Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch missions for a profile
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

        const missions = await prisma.mission.findMany({
            where: { profileId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                progress: true,
                log: true,
                createdAt: true,
                updatedAt: true,
                completedAt: true,
            },
        });

        return NextResponse.json({ missions });
    } catch (error: any) {
        console.error('Mission GET error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST: Create a new mission
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { profileId, title, description } = body;

        // Validation
        if (!profileId || typeof profileId !== 'string') {
            return NextResponse.json(
                { error: 'profileId is required' },
                { status: 400 }
            );
        }

        if (!title || typeof title !== 'string') {
            return NextResponse.json(
                { error: 'title is required' },
                { status: 400 }
            );
        }

        // Create mission
        const mission = await prisma.mission.create({
            data: {
                profileId,
                title,
                description: description || null,
                status: 'ACTIVE',
                progress: 0,
                log: JSON.stringify([
                    {
                        timestamp: new Date().toISOString(),
                        action: 'MISSION_CREATED',
                        message: 'Mission initialisée'
                    }
                ]),
            },
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                progress: true,
                log: true,
                createdAt: true,
            },
        });

        console.log(`✅ Mission created: ${mission.id} - ${mission.title}`);

        return NextResponse.json({ mission }, { status: 201 });
    } catch (error: any) {
        console.error('Mission POST error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH: Update mission progress/status
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { missionId, progress, status, logEntry } = body;

        if (!missionId) {
            return NextResponse.json(
                { error: 'missionId is required' },
                { status: 400 }
            );
        }

        // Fetch current mission
        const currentMission = await prisma.mission.findUnique({
            where: { id: missionId },
        });

        if (!currentMission) {
            return NextResponse.json(
                { error: 'Mission not found' },
                { status: 404 }
            );
        }

        // Parse and update log
        const currentLog = JSON.parse(currentMission.log);
        if (logEntry) {
            currentLog.push({
                timestamp: new Date().toISOString(),
                ...logEntry
            });
        }

        // Update mission
        const updatedMission = await prisma.mission.update({
            where: { id: missionId },
            data: {
                progress: progress !== undefined ? progress : currentMission.progress,
                status: status || currentMission.status,
                log: JSON.stringify(currentLog),
                completedAt: status === 'COMPLETED' ? new Date() : currentMission.completedAt,
            },
        });

        return NextResponse.json({ mission: updatedMission });
    } catch (error: any) {
        console.error('Mission PATCH error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
