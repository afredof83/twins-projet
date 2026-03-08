export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';

export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const body = await request.json();
        const { userId, targetId } = body;
        if (!userId || !targetId) return NextResponse.json({ success: false, error: 'IDs manquants' }, { status: 400 });

        const user = await prisma.profile.findUnique({ where: { id: userId } });
        const target = await prisma.profile.findUnique({ where: { id: targetId } });
        if (!user || !target) return NextResponse.json({ success: false, error: 'Profil introuvable' }, { status: 404 });

        const prompt = `Tu es Agent, un proxy tactique d'ingénierie sociale.\nTa mission : Rédiger l'approche PARFAITE.\n\nADN EXPÉDITEUR : ${user.primaryRole || 'Non spécifié'} - ${(user as any).industry || (user as any).sector || 'Non spécifié'}\nADN CIBLE : ${target.primaryRole || 'Non spécifié'} - ${(target as any).industry || (target as any).sector || 'Non spécifié'}\n\nRÈGLES D'ENGAGEMENT :\n1. "hook" : Un objet/titre ultra-court pour la notification. Max 6 mots.\n2. "message" : Le message complet de 3 phrases maximum.\n\nFORMAT DE RÉPONSE OBLIGATOIRE (JSON STRICT) :\n{"hook": "Ton accroche ici", "message": "Ton message complet ici"}`;

        const response = await mistralClient.chat.complete({
            model: "mistral-large-latest",
            messages: [{ role: "user", content: prompt }],
            responseFormat: { type: "json_object" }
        });
        const rawContent = response.choices?.[0].message.content;
        if (!rawContent) return NextResponse.json({ success: false, error: "Silence radio de l'IA." }, { status: 500 });
        const openerData = JSON.parse(rawContent as string);
        return NextResponse.json({ success: true, hook: openerData.hook, message: openerData.message });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
