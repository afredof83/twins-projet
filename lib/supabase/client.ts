import { createBrowserClient } from '@supabase/ssr'

// Référence mémoire vide au départ
let supabaseBrowserClient: ReturnType<typeof createBrowserClient> | undefined

// On exporte uniquement une FONCTION — plus de variable globale `supabase`
export function createClient() {
    if (!supabaseBrowserClient) {
        supabaseBrowserClient = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    }
    return supabaseBrowserClient
}