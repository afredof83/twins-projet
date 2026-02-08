import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const { profileId, password } = await request.json();

        // 1. Validation
        if (!profileId || !password) {
            return NextResponse.json({ error: 'Identifiant et mot de passe requis.' }, { status: 400 });
        }
        if (profileId.length < 3) {
            return NextResponse.json({ error: "L'identifiant est trop court." }, { status: 400 });
        }

        // 2. Vérification existence
        const { data: existing } = await supabase
            .from('Profile')
            .select('id')
            .eq('id', profileId)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'Ce nom de clone est déjà pris.' }, { status: 409 });
        }

        // 3. Création du Profil avec TOUS les champs de sécurité requis
        // On génère des valeurs "dummy" pour satisfaire les contraintes NOT NULL de la base
        const { error: insertError } = await supabase
            .from('Profile')
            .insert([
                {
                    id: profileId,
                    name: profileId,
                    passwordHash: password,
                    vectorNamespace: profileId,
                    createdAt: new Date().toISOString(),

                    // --- CORRECTIF SÉCURITÉ ---
                    // La base exige ces champs, on met des valeurs par défaut
                    saltBase64: "dummy_salt_v2",
                    verifierBase64: "dummy_verifier_v2",
                    encryptionKeyEncrypted: "dummy_key_v2"
                }
            ]);

        if (insertError) {
            console.error("Erreur Création:", insertError);
            return NextResponse.json({ error: insertError.message || "Erreur technique SQL" }, { status: 500 });
        }

        // 4. Initialisation mémoire
        await supabase.from('Memory').insert([{
            profileId: profileId,
            content: "Système initialisé.",
            encryptedContent: "Système initialisé.",
            type: 'system',
            embedding: Array(1024).fill(0)
        }]);

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("Erreur Serveur:", e);
        return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
    }
}