export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { mistralClient } from '@/lib/mistral';
import { trackAgentActivity } from '@/app/actions/missions';
import { createClientServer } from '@/lib/supabaseScoped';

// POST /api/terminal — executeTerminalCommand
export async function POST(request: Request) {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const { user, supabase } = await createClientServer(request);
        const body = await request.json();
        const { userId, prompt } = body;
        if (!prompt) return NextResponse.json({ success: false, error: 'Ordre vide' }, { status: 400 });

        const embRes = await mistralClient.embeddings.create({ model: "mistral-embed", inputs: [prompt] });
        const queryEmbedding = embRes.data[0].embedding;

        const internalSearch = supabase.rpc('hybrid_search_memories', {
            query_text: prompt, query_embedding: queryEmbedding, match_threshold: 0.50, match_count: 5, exclude_profile_id: userId || user.id
        });
        let externalSearch: Promise<any> = Promise.resolve({ results: [] });
        if (process.env.TAVILY_API_KEY) {
            externalSearch = fetch('https://api.tavily.com/search', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query: `${prompt} profil professionnel OR LinkedIn`, search_depth: "basic", max_results: 3 })
            }).then(res => res.json()).catch(() => ({ results: [] }));
        }
        const [internalRes, externalData] = await Promise.all([internalSearch, externalSearch]);

        let internalContext = "Aucune donnée interne trouvée.";
        if (internalRes.data?.length > 0) internalContext = internalRes.data.map((m: any) => `[ID Interne: ${m.profile_id}] - Mémoire: ${m.content}`).join('\n');
        let externalContext = "Aucune donnée externe trouvée.";
        if (externalData.results?.length > 0) externalContext = externalData.results.map((r: any) => `[Web] ${r.title}\nURL: ${r.url}\nExtrait: ${r.content}`).join('\n\n');

        const aiPrompt = `Tu es l'unité de ciblage d'un système radar.\nOrdre : "${prompt}"\nCAPTEURS INTERNES:\n"""${internalContext}"""\nCAPTEURS EXTERNES:\n"""${externalContext}"""\n[TARGETS: [{"name": "Nom Réel", "lat": 48.6, "lng": -2.0}]]`;

        const response = await mistralClient.chat.complete({ model: "mistral-large-latest", messages: [{ role: "system", content: aiPrompt }] });
        const rawContent = (response.choices?.[0].message.content as string) || "";
        let extractedTargets: any[] = [];
        const targetMatch = rawContent.match(/\[TARGETS:\s*([\s\S]*?)\]/);
        if (targetMatch?.[1]) { try { extractedTargets = JSON.parse(targetMatch[1]); } catch (e) { } }
        const cleanAnswer = rawContent.replace(/\[TARGETS:.*?\]/g, '').trim();

        await trackAgentActivity(userId || user.id, 'message');
        return NextResponse.json({ success: true, answer: cleanAnswer, targets: extractedTargets, webResults: externalData.results || [] });
    } catch (e: any) {
        if (e.message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
