export const runtime = 'edge'; // On garde l'Edge pour le streaming
import { NextRequest } from 'next/server';
import { createClientServer } from '@/lib/supabaseScoped';
import { mistralClient } from '@/lib/mistral';

export async function POST(req: NextRequest) {
    try {
        const { user } = await createClientServer(req);
        const { opportunityId } = await req.json();

        if (!opportunityId) return new Response(JSON.stringify({ error: 'ID manquant' }), { status: 400 });

        const { supabase } = await createClientServer(req);

        // 🛡️ RATE LIMIT V2 : 5 analyses par heure avec retour détaillé
        const { data: quota } = await supabase.rpc('check_rate_limit_v2', {
            p_user_id: user.id,
            p_endpoint: 'synergy_analysis',
            p_max_calls: 5,         // 5 analyses max
            p_window_minutes: 60    // par heure
        });

        if (!quota.allowed) {
            return new Response(JSON.stringify({ 
                error: 'Quota atteint. Réessaie plus tard.', 
                quota: quota 
            }), { status: 429, headers: { 'Content-Type': 'application/json' } });
        }

        const { data: opp } = await supabase.from('opportunities').select('title, synergies').eq('id', opportunityId).single();
        
        if (!opp) return new Response("Not found", { status: 404 });

        // 2. VECTORISATION : On transforme le sujet en coordonnée mathématique
        const embeddingRes = await mistralClient.embeddings.create({
            model: 'mistral-embed',
            inputs: [`${opp.title || ''} ${opp.synergies || ''}`],
        });
        const queryVector = embeddingRes.data[0].embedding;

        // 3. RPC V3 : On demande à Postgres les souvenirs PERTINENTS avec un seuil de similitude
        const SIMILARITY_THRESHOLD = 0.6; // Ton nouveau garde-fou

        const { data: context, error: ctxError } = await supabase.rpc('get_synergy_context_v3', { 
            p_opportunity_id: opportunityId,
            p_query_embedding: queryVector,
            p_threshold: SIMILARITY_THRESHOLD 
        });

        if (ctxError || !context) {
            console.error("❌ [RPC-ERROR]:", ctxError);
            return new Response(JSON.stringify({ error: 'Échec du contexte sémantique' }), { status: 500 });
        }

        // 4. VÉRIFICATION D'IDENTITÉ CORRIGÉE
        const isAuthorized = context.source_profile.data.user_id === user.id || context.target_profile.data.user_id === user.id;
        if (!isAuthorized) return new Response(JSON.stringify({ error: 'Accès interdit' }), { status: 403 });

        // 5. PRÉPARATION DU PROMPT (Gestion du vide & Directives V3)
        const sourceCtx = context.source_profile.context || "AUCUNE DONNÉE PERTINENTE TROUVÉE DANS LE CORTEX.";
        const targetCtx = context.target_profile.context || "AUCUNE DONNÉE PERTINENTE TROUVÉE DANS LE CORTEX.";

        const prompt = `Analyse la synergie entre ${context.source_profile.data.name} et ${context.target_profile.data.name}. 
                        Sujet: ${opp.title}
                        Contexte Chirurgical (Profil A): ${sourceCtx}
                        Contexte Chirurgical (Profil B): ${targetCtx}
                        
                        IMPORTANT: Si le contexte indique 'AUCUNE DONNÉE', signale explicitement dans l'audit 
                        que ton analyse est limitée par manque d'informations sémantiques 
                        sur ce sujet spécifique.`;

        // 6. STREAMING MISTRAL
        const responseStream = await mistralClient.chat.stream({
            model: 'mistral-small-latest',
            messages: [{ role: 'user', content: prompt }],
        });

        const encoder = new TextEncoder();
        let fullAudit = '';

        return new Response(new ReadableStream({
            async start(controller) {
                for await (const chunk of responseStream) {
                    const contentDelta = chunk.data?.choices?.[0]?.delta?.content;
                    let content = '';
                    if (typeof contentDelta === 'string') {
                        content = contentDelta;
                    } else if (Array.isArray(contentDelta)) {
                        content = contentDelta.map((c: any) => c.text || '').join('');
                    }

                    if (content) {
                        fullAudit += content;
                        controller.enqueue(encoder.encode(content));
                    }
                }
                controller.close();
                
                // 6. PERSISTENCE POST-STREAM
                const { getSupabaseAdmin } = await import('@/lib/supabaseServer');
                const adminClient = getSupabaseAdmin();
                adminClient.from('opportunities').update({ audit: fullAudit, status: 'ANALYZED' }).eq('id', opportunityId).then();
            },
        }), {
            headers: { 
                'Content-Type': 'text/event-stream',
                'X-RateLimit-Remaining': quota.remaining.toString(),
                'X-RateLimit-Reset': quota.reset_minutes.toString()
            }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
