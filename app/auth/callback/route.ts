import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

/**
 * Route de callback OAuth/Magic Link.
 * Supabase redirige ici aprÃ¨s une connexion externe avec un `code` dans l'URL.
 * On l'Ã©change contre une session, qui sera ecrite dans les cookies SSR.
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // `next` permet de rediriger vers une page prÃ©cise aprÃ¨s connexion (optionnel)
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Redirection vers le dashboard (ou la page demandÃ©e)
            return NextResponse.redirect(`${origin}${next}`)
        }

        console.error('[auth/callback] Erreur Ã©change de code:', error.message)
    }

    // En cas d'erreur ou d'absence de code â†’ page d'erreur ou page de connexion
    return NextResponse.redirect(`${origin}/?error=auth_callback_failed`)
}
