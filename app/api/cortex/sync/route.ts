import { createClient } from '@/lib/supabaseServer';
import { Mistral } from '@mistralai/mistralai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { profileId } = await req.json();
        const supabase = await createClient();
        const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

        // 1. Maintenance SQL (Doublons + Expiration)
        // On appelle la fonction RPC qu'on vient de créer via SQL
        // Si la fonction n'existe pas encore en DB, cela échouera silencieusement ou lèvera une erreur catchée.
        const { error: rpcError } = await supabase.rpc('run_cortex_maintenance', { p_profile_id: profileId });
        if (rpcError) console.warn("Attention: Maintenance RPC échouée (Fonction manquante ?)", rpcError.message);

        // 2. Vérification du "Cool Down"
        // On regarde si une [META] mémoire a été créee récemment
        const { data: lastMeta } = await supabase
            .from('Memory')
            .select('createdAt')
            .ilike('content', '[ÉVEIL PROFOND]%')
            .eq('profileId', profileId)
            .order('createdAt', { ascending: false })
            .limit(1)
            .maybeSingle();

        const hoursSinceLastAwake = lastMeta
            ? (Date.now() - new Date(lastMeta.createdAt).getTime()) / (1000 * 60 * 60)
            : 99;

        let awakeStatus = "Skipped (Cool Down)";

        if (hoursSinceLastAwake > 4) {
            // 3. Éveil Profond (Synthèse par IA)
            const { data: recent } = await supabase
                .from('Memory')
                .select('content')
                .eq('profileId', profileId)
                .order('createdAt', { ascending: false })
                .limit(15);

            if (recent && recent.length > 5) {
                const context = recent.map(m => m.content).join('\n');

                try {
                    const response = await mistral.chat.complete({
                        model: "mistral-small-latest",
                        messages: [
                            { role: "system", content: "Tu es le subconscient du Clone. Synthétise les derniers événements ou pensées en une phrase courte d'insight percutant (max 20 mots)." },
                            { role: "user", content: `Souvenirs récents :\n${context}` }
                        ]
                    });

                    let insight = response.choices?.[0].message.content;

                    if (Array.isArray(insight)) {
                        insight = insight.map((c: any) => c.text || "").join(" ");
                    }

                    if (typeof insight === 'string' && insight.length > 0) {
                        // On insère l'insight via un appel API interne ou direct DB
                        // Ici direct DB pour simplicité

                        // On embed l'insight pour qu'il soit recherchable
                        const embeddingResponse = await mistral.embeddings.create({
                            model: "mistral-embed",
                            inputs: [insight],
                        });

                        await supabase.from('Memory').insert({
                            content: `[ÉVEIL PROFOND] ${insight}`,
                            profileId: profileId,
                            type: 'thought',
                            embedding: embeddingResponse.data[0].embedding,
                            source: 'cortex_sync'
                        });
                        awakeStatus = "Insight Generated: " + insight;
                    }
                } catch (mistralError) {
                    console.error("Erreur Mistral Sync:", mistralError);
                }
            } else {
                awakeStatus = "Not enough context";
            }
        }

        return NextResponse.json({ status: 'Cortex Synced', detail: awakeStatus });

    } catch (error: any) {
        console.error("Erreur Sync:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
