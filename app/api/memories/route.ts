import { mistralClient } from "@/lib/mistral";
import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { trackAgentActivity } from '@/app/actions/missions';
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const pid = searchParams.get('profileId');

    if (!pid) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 });

    const supabase = await createClient();

    console.log(`🔍 Lecture Memory pour ${pid}`);

    const { data, error } = await supabase
        .from('memory')
        .select('*')
        .eq('profile_id', pid)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("âŒ Erreur lecture:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ memories: data || [] });
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const body = await req.json();
        const { content, profileId, type } = body;

        console.log(`ðŸ“ Tentative sauvegarde pour ID: ${profileId}`);

        // ✅ Nettoyage d'urgence côté serveur (null bytes)
        const sanitizedContent = (content || '').replace(/\0/g, '').replace(/\u0000/g, '');

        const memoryData = {
            id: crypto.randomUUID(),
            content: sanitizedContent,
            profile_id: profileId,
            type: type || 'thought',
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('memory')
            .insert([memoryData])
            .select()
            .single();

        if (error) {
            console.error("🔥 Erreur écriture DB:", error);
            throw error;
        }

        console.log("✅ Sauvegarde réussie, ID:", data?.id);
        await trackAgentActivity(profileId, 'memory');
        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        // Contrôle d'accès : Bearer token obligatoire
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return Response.json({ error: "Token manquant." }, { status: 401 });

        const body = await req.json();
        const { id, content, profileId } = body;

        if (!id || !content || !profileId) {
            return Response.json({ error: "Paramètres invalides (id, content, profileId requis)." }, { status: 400 });
        }

        // 1. Re-vectorisation via Mistral (le vecteur doit refléter le nouveau texte)
        const mistral = mistralClient;
        const embeddingResponse = await mistral.embeddings.create({
            model: "mistral-embed",
            inputs: [content],
        });
        const newEmbedding = embeddingResponse.data[0]?.embedding;

        // 2. Client utilisateur authentifié (utilise les cookies Next.js)
        const supabase = await createClient();

        // 3. Mise à jour du fragment (contenu + nouveau vecteur)
        const { error } = await supabase
            .from('memory')
            .update({ content, embedding: newEmbedding })
            .eq('id', id)
            .eq('profile_id', profileId);

        if (error) throw error;

        console.log(`✅ Fragment ${id} re-vectorisé et mis à jour.`);
        return Response.json({ success: true });

    } catch (error: any) {
        console.error("[CRITIQUE ÉDITION MÉMOIRE]", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        // Contrôle d'accès : Bearer token obligatoire
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return Response.json({ error: "Token manquant." }, { status: 401 });

        const body = await req.json();
        const { id, profileId } = body;

        if (!id || !profileId) {
            return Response.json({ error: "Paramètres invalides (id et profileId requis)." }, { status: 400 });
        }

        // Client utilisateur authentifié (utilise les cookies Next.js)
        const supabase = await createClient();

        // Ordre de destruction (double sécurité : id ET profile_id)
        const { data, error } = await supabase
            .from('memory')
            .delete()
            .eq('id', id)
            .eq('profile_id', profileId)
            .select(); // Force Supabase à retourner les lignes supprimées

        if (error) throw error;

        // Tableau vide = RLS a bloqué ou ID inexistant â†’ on refuse de mentir
        if (!data || data.length === 0) {
            return Response.json(
                { error: "Échec de la purge : Fragment introuvable ou accès refusé." },
                { status: 403 }
            );
        }

        console.log(`ðŸ—‘ï¸ Fragment ${id} purgé.`);
        await trackAgentActivity(profileId, 'memory_delete');
        return Response.json({ success: true });

    } catch (error: any) {
        console.error("[CRITIQUE PURGE MÉMOIRE]", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
