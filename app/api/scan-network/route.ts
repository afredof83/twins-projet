export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';
import { trackAgentActivity } from '@/app/actions/missions';
import { createClientServer } from '@/lib/supabaseScoped';

// POST /api/scan-network
export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { user, supabase } = await createClientServer(request);
        const body = await request.json();
        const { userId, mode = 'basic' } = body;

        const agent: any = await prisma.profile.findUnique({ where: { id: userId || user.id } });
        if (!agent) return NextResponse.json({ success: false, error: 'Agent introuvable' }, { status: 404 });

        const searchIntent = `Profil: ${agent.profession || 'Général'}. Objectifs: ${agent.objectives?.join(', ') || 'Opportunités stratégiques'}`;
        const embeddingResponse = await mistralClient.embeddings.create({ model: "mistral-embed", inputs: [searchIntent] });
        const queryVector = embeddingResponse.data[0].embedding;

        const { data: ragResults } = await supabase.rpc('match_memories', {
            query_embedding: queryVector, match_threshold: 0.75, match_count: 10, filter_profile_id: userId || user.id,
        });

        const contextBlock = ragResults?.length > 0
            ? ragResults.map((r: any) => `[Score: ${r.similarity?.toFixed(2)}] ${r.content}`).join('\n')
            : 'Aucune mémoire pertinente trouvée.';

        const promptContent = mode === 'deep'
            ? `Tu es TWINS_INTEL. Analyse approfondie.\nAGENT: ${agent.name}, ${agent.profession}\nDONNÉES:\n${contextBlock}\nGénère JSON: {"globalStatus":"GREEN|ORANGE|RED","analysisSummary":"..","overallMatchScore":0-100,"targets":[{"name":"..","lat":0,"lng":0,"type":"contact"}],"opportunities":[{"title":"..","reasoning":"..","priority":1}]}`
            : `Tu es TWINS_INTEL, radar de surface rapide.\nAGENT: ${agent.name}, ${agent.profession}\nDONNÉES:\n${contextBlock}\nGénère JSON: {"globalStatus":"GREEN|ORANGE|RED","analysisSummary":"..","targets":[{"name":"..","lat":0,"lng":0,"type":"contact"}]}`;

        const response = await mistralClient.chat.complete({
            model: "mistral-large-latest",
            messages: [{ role: "system", content: promptContent }],
            responseFormat: { type: "json_object" }
        });

        const rawContent = response.choices?.[0]?.message?.content;
        let aiAnalysis: any = {};
        try {
            const cleanJsonContent = (rawContent as string).replace(/\[TARGETS:[\s\S]*?\]/g, '').trim();
            const jsonMatch = cleanJsonContent.match(/\{[\s\S]*\}/);
            aiAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleanJsonContent);
        } catch (e) {
            return NextResponse.json({ success: false, error: 'Erreur parsing JSON Mistral' }, { status: 500 });
        }

        await trackAgentActivity(userId || user.id, 'scan');
        return NextResponse.json({ ...aiAnalysis, targetId: userId || user.id, targets: aiAnalysis.targets || [] });
    } catch (e: any) {
        if (e.message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
