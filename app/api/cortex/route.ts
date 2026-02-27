import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const USER_ID = "28de7876-17a4-4648-8f78-544dcea980f1"; // Toujours ton ID

// 1. LIRE les notes du Cortex
export async function GET() {
    try {
        const notes = await prisma.cortexNote.findMany({
            where: { profileId: USER_ID },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(notes);
    } catch (error) {
        return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
    }
}

// 2. AJOUTER une note au Cortex
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const noteContent = body.title
            ? `${body.title}\n\n${body.content}`
            : body.content;

        const newNote = await prisma.cortexNote.create({
            data: {
                content: noteContent,
                profileId: USER_ID
            }
        });

        return NextResponse.json({ success: true, note: newNote });
    } catch (error) {
        return NextResponse.json({ error: "Erreur de sauvegarde" }, { status: 500 });
    }
}
