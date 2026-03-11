import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { mistralClient } from '@/lib/mistral';

export const runtime = 'edge';

/**
 * 🔥 [EDGE-STREAM] Lazy Evaluation - Streaming Markdown Audit
 * Purpose: High-performance streaming synergy analysis using Edge Runtime.
 * Flow: Mistral Stream -> ReadableStream -> Post-stream Update (WaitUntil).
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Auth & Request
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const { opportunityId } = await req.json();
        if (!opportunityId) {
            return new Response(JSON.stringify({ error: 'Missing opportunityId' }), { status: 400 });
        }

        // 2. Data Retrieval (Direct Supabase for Edge compatibility)
        // Fetch opportunity + profiles in parallel
        const { data: opportunity, error: oppError } = await supabase
            .from('Opportunity')
            .select(`
                *,
                sourceProfile:sourceId (*),
                targetProfile:targetId (*)
            `)
            .eq('id', opportunityId)
            .single();

        if (oppError || !opportunity) {
            return new Response(JSON.stringify({ error: 'Opportunity not found' }), { status: 404 });
        }

        if (opportunity.sourceId !== user.id && opportunity.targetId !== user.id) {
            return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403 });
        }

        const source = opportunity.sourceProfile;
        const target = opportunity.targetProfile;

        // Fetch Cortex data (Memories & Notes)
        const [sourceCortex, targetCortex] = await Promise.all([
            fetchCortexData(supabase, source.id),
            fetchCortexData(supabase, target.id)
        ]);

        console.log(`📡 [EDGE-STREAM] Starting stream for ${opportunityId}`);

        // 3. Hermetic Prompt with Markdown Constraint & Contextual Tone
        const isWork = (opportunity.context || 'WORK') === 'WORK';
        const toneDirective = isWork 
            ? "Adopte un ton formel, professionnel et B2B. Concentre-toi sur l'expertise, le ROI et les synergies stratégiques."
            : "Adopte un ton décontracté, chaleureux et personnel. Concentre-toi sur les points communs, les valeurs humaines et les passions partagées.";

        const prompt = `Tu es Cortex, une IA de renseignement sémantique spécialisée dans l'analyse de synergies ${isWork ? 'professionnelles' : 'personnelles'}.
        ${toneDirective}
        Analyse la synergie ENTRE deux entités distinctes. 

        <Profil_A>
        [INITIATEUR]
        Nom: ${source.name || 'Agent Furtif'}
        Rôle: ${source.primaryRole || 'Non défini'}
        Secteur: ${source.sector || 'Non défini'}
        Bio: ${source.bio || 'Non spécifiée'}
        Cortex Data: ${sourceCortex || 'Aucune donnée.'}
        </Profil_A>

        <Profil_B>
        [CIBLE / TOI]
        Nom: ${target.name || 'Agent Furtif'}
        Rôle: ${target.primaryRole || 'Non défini'}
        Secteur: ${target.sector || 'Non défini'}
        Bio: ${target.bio || 'Non spécifiée'}
        Cortex Data: ${targetCortex || 'Aucune donnée.'}
        </Profil_B>

        INSTRUCTION: Génère un rapport d'audit "Executive Summary" ultra-concis. Utilise EXACTEMENT ce template Markdown, sans modifier les titres. Sois percutant (2 lignes max par point). Ne confonds pas les profils.

        🎯 QUI EST ${source.name || 'Profil A'} ?
        [1 phrase impactante résumant son rôle et son expertise]

        🎯 QUI EST ${target.name || 'Profil B'} ?
        [1 phrase impactante résumant son rôle et son expertise]

        ⚡ POTENTIEL DE SYNERGIE
        [1 seul paragraphe très direct de 3 lignes maximum expliquant le projet ${isWork ? 'commun' : 'de rencontre'} potentiel]

        🚀 CE QUE ${source.name || 'Profil A'} APPORTE À ${target.name || 'Profil B'}

        🔹 [Atout clé 1] : [Bénéfice direct, très court]

        🔹 [Atout clé 2] : [Bénéfice direct, très court]

        💎 CE QUE ${target.name || 'Profil B'} APPORTE À ${source.name || 'Profil A'}

        🔸 [Atout clé 1] : [Bénéfice direct, très court]

        🔸 [Atout clé 2] : [Bénéfice direct, très court]

        RÉPOND UNIQUEMENT EN MARKDOWN.`;

        // 4. Mistral Streaming
        const responseStream = await mistralClient.chat.stream({
            model: 'mistral-small-latest',
            messages: [{ role: 'user', content: prompt }],
        });

        const encoder = new TextEncoder();
        let fullAudit = '';

        const stream = new ReadableStream({
            async start(controller) {
                for await (const chunk of responseStream) {
                    // @ts-ignore - Mistral SDK typing can be tricky in Edge
                    const contentDelta = chunk.data?.choices?.[0]?.delta?.content;
                    
                    let contentString = '';
                    if (typeof contentDelta === 'string') {
                        contentString = contentDelta;
                    } else if (Array.isArray(contentDelta)) {
                        contentString = contentDelta.map((c: any) => c.text || '').join('');
                    }

                    if (contentString) {
                        fullAudit += contentString;
                        controller.enqueue(encoder.encode(contentString));
                    }
                }
                controller.close();

                // 5. Post-stream Update (Database)
                // In Edge runtime, we perform the update after the stream finishes within the generator
                // to avoid blocking the initial response.
                await updateAuditDatabase(supabase, opportunityId, fullAudit);
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error("🔥 [EDGE-FAILURE]:", error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

async function fetchCortexData(supabase: any, profileId: string): Promise<string> {
    const [memories, notes] = await Promise.all([
        supabase.from('memory').select('content').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(10),
        supabase.from('CortexNote').select('content').eq('profileId', profileId).order('createdAt', { ascending: false }).limit(5)
    ]);

    const mText = (memories.data || []).map((m: any) => m.content).join('; ');
    const nText = (notes.data || []).map((n: any) => n.content).join('; ');

    return `${mText} ${nText}`.trim();
}

async function updateAuditDatabase(supabase: any, opportunityId: string, audit: string) {
    try {
        const { error } = await supabase
            .from('Opportunity')
            .update({ audit, status: 'ANALYZED' })
            .eq('id', opportunityId);
        
        if (error) console.error("❌ [DB-UPDATE] Failed:", error.message);
        else console.log(`✅ [DB-UPDATE] Opportunity ${opportunityId} persists.`);
    } catch (e) {
        console.error("❌ [DB-UPDATE] Critical Error:", e);
    }
}
