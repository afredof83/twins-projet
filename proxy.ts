// proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    try {
        let supabaseResponse = NextResponse.next({ request })

        // VÉRIFICATION N°1 : Les variables d'environnement
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            console.error("🔴 ERREUR CRITIQUE : Variables d'environnement Supabase manquantes !")
            return supabaseResponse
        }

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                            supabaseResponse = NextResponse.next({ request })
                            cookiesToSet.forEach(({ name, value, options }) =>
                                supabaseResponse.cookies.set(name, value, options)
                            )
                        } catch (error) {
                            // Ignore les erreurs de set cookie sur les chemins statiques
                        }
                    },
                },
            }
        )

        // VÉRIFICATION N°2 : Lecture du User
        const { data: { user } } = await supabase.auth.getUser()

        const isProtectedRoute = request.nextUrl.pathname === '/' ||
            request.nextUrl.pathname.startsWith('/cortex');

        if (!user && isProtectedRoute) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        if (user && request.nextUrl.pathname === '/login') {
            const url = request.nextUrl.clone()
            url.pathname = '/'
            return NextResponse.redirect(url)
        }

        return supabaseResponse

    } catch (error) {
        // Si ça plante, on l'affiche en rouge vif dans ton terminal
        console.error("🔴 CRASH PROXY.TS :", error)
        return NextResponse.next({ request })
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}