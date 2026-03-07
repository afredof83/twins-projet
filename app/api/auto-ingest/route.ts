export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';

// POST /api/auto-ingest — extractText, extractProfileData, confirmIngestion
export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file') as File;
            if (!file) return NextResponse.json({ success: false, error: 'Fichier manquant' }, { status: 400 });
            const text = await file.text();
            return NextResponse.json({ success: true, extractedText: text });
        }

        const body = await request.json();
        const { action } = body;

        if (action === 'extractProfileData') {
            const { rawData } = body;
            const prompt = `Tu es le Cortex de l'application Ipse.\nDONNÉES : """${rawData}"""\nFORMAT JSON ATTENDU STRICT :\n{"profession":"Titre","industry":"Secteur","seniority":"Niveau","objectives":["Obj1"],"ikigaiMission":"Mission","socialStyle":"Style"}`;
            const chatResponse = await mistralClient.chat.complete({
                model: 'mistral-large-latest',
                messages: [{ role: 'user', content: prompt }],
                responseFormat: { type: 'json_object' },
                temperature: 0.1,
            });
            const rawContent = chatResponse.choices?.[0].message.content;
            if (!rawContent) return NextResponse.json({ success: false, error: 'Réponse vide' }, { status: 500 });
            const profileData = JSON.parse(rawContent as string);
            return NextResponse.json({ success: true, data: profileData });
        }

        if (action === 'confirmIngestion') {
            const { userId, validatedData } = body;
            await prisma.profile.update({
                where: { id: userId },
                data: {
                    profession: validatedData.profession,
                    thematicProfile: {
                        industry: validatedData.industry,
                        seniority: validatedData.seniority,
                        objectives: validatedData.objectives,
                        ikigaiMission: validatedData.ikigaiMission,
                        socialStyle: validatedData.socialStyle,
                    },
                }
            });
            const textToEmbed = `Profil: ${validatedData.profession}. Secteur: ${validatedData.industry}. Niveau: ${validatedData.seniority}. Objectifs: ${validatedData.objectives.join(', ')}. Mission: ${validatedData.ikigaiMission}.`;
            const embeddingsResponse = await mistralClient.embeddings.create({ model: 'mistral-embed', inputs: [textToEmbed] });
            const embeddingVector = embeddingsResponse.data[0].embedding;
            await prisma.$executeRaw`UPDATE "Profile" SET embedding = ${embeddingVector}::vector WHERE id = ${userId}`;
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: 'Action non reconnue' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
