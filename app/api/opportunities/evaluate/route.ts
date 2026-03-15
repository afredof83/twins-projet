import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { mistralClient } from '@/lib/mistral';

export const runtime = 'edge'; // Utilise 'nodejs' si Edge pose problème avec ton infrastructure

export async function POST(req: NextRequest) {
    try {
        // 1. Authentification
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { opportunityId } = await req.json();
        if (!opportunityId) {
            return NextResponse.json({ error: 'Missing opportunityId' }, { status: 400 });
        }

        // 2. Récupération des données via RPC (Optimisé pour Edge)
        const { data: ctx, error: rpcError } = await supabase.rpc('get_synergy_context', { p_opportunity_id: opportunityId });
        if (rpcError || !ctx) {
            console.error("❌ [RPC-ERROR]:", rpcError);
            return NextResponse.json({ error: 'Context aggregation failed' }, { status: 500 });
        }

        const { opportunity, source_profile, target_profile, source_cortex, target_cortex } = ctx;

        // 3. Vérification de sécurité (Appartenance de l'opportunité)
        if (source_profile.user_id !== user.id && target_profile.user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
        }

        // 4. Préparation du Prompt
        const isWork = (opportunity.context || 'WORK') === 'WORK';
        const toneDirective = isWork
            ? "Adopte un ton formel, professionnel et B2B. Concentre-toi sur l'expertise, le ROI et les synergies stratégiques."
            : "Adopte un ton décontracté, chaleureux et personnel. Concentre-toi sur les points communs, les valeurs et les passions partagées.";

        const sCortexText = `${(source_cortex?.memories || []).join('; ')}; ${(source_cortex?.notes || []).join('; ')}`.trim();
        const tCortexText = `${(target_cortex?.memories || []).join('; ')}; ${(target_cortex?.notes || []).join('; ')}`.trim();

        const prompt = `Tu es Cortex, une IA de renseignement sémantique spécialisée dans l'analyse de synergies ${isWork ? 'professionnelles' : 'personnelles'}.
        ${toneDirective}
        Analyse la synergie ENTRE ces deux profils.

        <Profil_A>
        Nom: ${source_profile.name || 'Agent A'}
        Rôle: ${source_profile.primary_role || 'Non défini'}
        Cortex: ${sCortexText || 'Aucune donnée'}
        </Profil_A>

        <Profil_B>
        Nom: ${target_profile.name || 'Agent B'}
        Rôle: ${target_profile.primary_role || 'Non défini'}
        Cortex: ${tCortexText || 'Aucune donnée'}
        </Profil_B>

        INSTRUCTION: Génère un rapport d'audit "Executive Summary" ultra-concis. Utilise EXACTEMENT ce template Markdown, sans modifier les titres. Sois percutant (2 lignes max par point). Ne confonds pas les profils.

        🎯 QUI EST ${source_profile.name || 'Profil A'} ?
        [1 phrase impactante résumant son rôle]

        🎯 QUI EST ${target_profile.name || 'Profil B'} ?
        [1 phrase impactante résumant son rôle]

        ⚡ POTENTIEL DE SYNERGIE
        [1 seul paragraphe très direct expliquant le projet commun potentiel]

        🚀 CE QUE ${source_profile.name || 'Profil A'} APPORTE À ${target_profile.name || 'Profil B'}
        🔹 [Atout clé 1] : [Bénéfice direct]
        🔹 [Atout clé 2] : [Bénéfice direct]

        💎 CE QUE ${target_profile.name || 'Profil B'} APPORTE À ${source_profile.name || 'Profil A'}
        🔸 [Atout clé 1] : [Bénéfice direct]
        🔸 [Atout clé 2] : [Bénéfice direct]

        RÉPOND UNIQUEMENT EN MARKDOWN.`;

        // 5. Appel au modèle Mistral en mode Stream
        const responseStream = await mistralClient.chat.stream({
            model: 'mistral-small-latest',
            messages: [{ role: 'user', content: prompt }],
        });

        const encoder = new TextEncoder();
        let fullAudit = '';

        // 6. Création du flux de lecture (ReadableStream)
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of responseStream) {
                        // 🛡️ FIX TYPESCRIPT MISTRAL SDK : Contournement de l'interface CompletionEvent
                        const chunkAny = chunk as any;
                        const contentDelta = chunkAny.choices?.[0]?.delta?.content || chunkAny.data?.choices?.[0]?.delta?.content || chunkAny.data;

                        let contentString = '';
                        if (typeof contentDelta === 'string') {
                            contentString = contentDelta;
                        } else if (Array.isArray(contentDelta)) {
                            contentString = contentDelta.map((c: any) => c.text || '').join('');
                        }

                        // Si on a du texte, on l'envoie au navigateur
                        if (contentString) {
                            fullAudit += contentString;
                            controller.enqueue(encoder.encode(contentString));
                        }
                    }
                } catch (e) {
                    console.error("❌ Erreur pendant la lecture du stream Mistral:", e);
                } finally {
                    controller.close();
                }

                // 7. Sauvegarde asynchrone dans Supabase une fois le stream terminé
                if (typeof after === 'function') {
                    after(async () => {
                        await supabase
                            .from('opportunities')
                            .update({ audit: fullAudit, status: 'ANALYZED' })
                            .eq('id', opportunityId);
                        console.log(`✅ [EDGE] Opportunity ${opportunityId} audit sauvegardé via after()`);
                    });
                } else {
                    await supabase
                        .from('opportunities')
                        .update({ audit: fullAudit, status: 'ANALYZED' })
                        .eq('id', opportunityId);
                    console.log(`✅ [NODE] Opportunity ${opportunityId} audit sauvegardé`);
                }
            },
        });

        // 8. Retourner la réponse en streaming au Front-End
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error("🔥 [EVALUATE-FAILURE]:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}