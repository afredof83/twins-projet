export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getPrismaForUser } from '@/lib/prisma'; // ⚡ Import NOMMÉ et SÉCURISÉ

export async function GET() {
    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                }
            }
        );

        // 1. Vérification absolue de l'identité
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        // 2. Instanciation du client blindé RLS
        const prismaRLS = getPrismaForUser(user.id);

        // 3. Synchronisation du profil (grâce à la nouvelle politique INSERT)
        const profile = await prismaRLS.profile.upsert({
            where: { id: user.id },
            update: {
                email: user.email!,
                // Mets à jour d'autres champs si nécessaire
            },
            create: {
                id: user.id,
                email: user.email!,
                // Assigne les champs par défaut
            }
        });

        return NextResponse.json({ success: true, profile });

    } catch (error) {
        console.error("Erreur de synchronisation Auth:", error);
        return NextResponse.json({ error: "Erreur serveur critique" }, { status: 500 });
    }
}