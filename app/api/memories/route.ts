import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';

// Client service-role pour les lectures (GET) â€” bypasse RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const pid = searchParams.get('profileId');

    if (!pid) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 });

    console.log(`ðŸ” Lecture Memory pour ${pid}`);

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
        const body = await req.json();
        const { content, profileId, type } = body;

        console.log(`ðŸ“ Tentative sauvegarde pour ID: ${profileId}`);

        // âœ… Nettoyage d'urgence cÃ´tÃ© serveur (null bytes)
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
            console.error("ðŸ”¥ Erreur Ã©criture DB:", error);
            throw error;
        }

        console.log("âœ… Sauvegarde rÃ©ussie, ID:", data?.id);
        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        // ContrÃ´le d'accÃ¨s : Bearer token obligatoire
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return Response.json({ error: "Token manquant." }, { status: 401 });

        const body = await req.json();
        const { id, content, profileId } = body;

        if (!id || !content || !profileId) {
            return Response.json({ error: "ParamÃ¨tres invalides (id, content, profileId requis)." }, { status: 400 });
        }

        // 1. Re-vectorisation via Mistral (le vecteur doit reflÃ©ter le nouveau texte)
        const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
        const embeddingResponse = await mistral.embeddings.create({
            model: "mistral-embed",
            inputs: [content],
        });
        const newEmbedding = embeddingResponse.data[0]?.embedding;

        // 2. Client BDD blindÃ© avec l'identitÃ© de l'utilisateur
        const supabaseAuth = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: { persistSession: false, autoRefreshToken: false },
                global: { headers: { Authorization: authHeader } }
            }
        );

        // 3. Mise Ã  jour du fragment (contenu + nouveau vecteur)
        const { error } = await supabaseAuth
            .from('memory')
            .update({ content, embedding: newEmbedding })
            .eq('id', id)
            .eq('profile_id', profileId);

        if (error) throw error;

        console.log(`âœ… Fragment ${id} re-vectorisÃ© et mis Ã  jour.`);
        return Response.json({ success: true });

    } catch (error: any) {
        console.error("[CRITIQUE Ã‰DITION MÃ‰MOIRE]", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        // ContrÃ´le d'accÃ¨s : Bearer token obligatoire
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return Response.json({ error: "Token manquant." }, { status: 401 });

        const body = await req.json();
        const { id, profileId } = body;

        if (!id || !profileId) {
            return Response.json({ error: "ParamÃ¨tres invalides (id et profileId requis)." }, { status: 400 });
        }

        // Client BDD blindÃ© avec l'identitÃ© de l'utilisateur (RLS actif)
        const supabaseAuth = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: { persistSession: false, autoRefreshToken: false },
                global: { headers: { Authorization: authHeader } }
            }
        );

        // Ordre de destruction (double sÃ©curitÃ© : id ET profile_id)
        const { data, error } = await supabaseAuth
            .from('memory')
            .delete()
            .eq('id', id)
            .eq('profile_id', profileId)
            .select(); // Force Supabase Ã  retourner les lignes supprimÃ©es

        if (error) throw error;

        // Tableau vide = RLS a bloquÃ© ou ID inexistant â†’ on refuse de mentir
        if (!data || data.length === 0) {
            return Response.json(
                { error: "Ã‰chec de la purge : Fragment introuvable ou accÃ¨s refusÃ©." },
                { status: 403 }
            );
        }

        console.log(`ðŸ—‘ï¸ Fragment ${id} purgÃ©.`);
        return Response.json({ success: true });

    } catch (error: any) {
        console.error("[CRITIQUE PURGE MÃ‰MOIRE]", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
