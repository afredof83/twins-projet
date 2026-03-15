import { createBrowserClient } from '@supabase/ssr'

// Variable pour stocker l'instance unique (Singleton Pattern)
let supabaseBrowserClient: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
    // 1. Si nous ne sommes pas dans un navigateur (SSR), on crée un client standard
    //    (pas de singleton côté serveur, chaque requête est indépendante)
    if (typeof window === 'undefined') {
        return createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    }

    // 2. Côté navigateur : on ne crée l'instance qu'une seule fois
    if (!supabaseBrowserClient) {
        supabaseBrowserClient = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            }
        )
    }

    // 3. On retourne toujours la même instance
    return supabaseBrowserClient
}
