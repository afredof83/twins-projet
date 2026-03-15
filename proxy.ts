import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proxy de protection des routes et rafraîchissement de session Supabase
 * Rôle : Assurer que les cookies de session sont à jour et protéger les accès privés.
 * Remplace middleware.ts pour éviter les conflits dans cette architecture.
 */
export async function proxy(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT : Utilisation de getUser() pour une vérification côté serveur sécurisée
    const { data: { user } } = await supabase.auth.getUser()

    // Définition des zones sécurisées
    const protectedRoutes = [
        '/chat',
        '/profile',
        '/radar',
        '/memories',
        '/cortex',
        '/connections'
    ]

    const path = request.nextUrl.pathname
    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))

    // Redirection si accès non autorisé
    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('next', path)
        return NextResponse.redirect(url)
    }

    // Protection inverse : rediriger vers / si déjà connecté et tente d'aller sur /login
    if (user && path === '/login') {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Matcher optimisé : exécution sur les routes applicatives
         * tout en ignorant les fichiers statiques et images.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}