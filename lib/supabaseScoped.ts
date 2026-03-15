import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * createClientServer - Scoped Supabase Client Utility
 * Handles JWT extraction from headers or cookies and returns a client
 * tied to the authenticated user's session for RLS enforcement.
 */
export async function createClientServer(req?: Request) {
    const cookieStore = await cookies();
    
    // 1. Extract Bearer Token from headers if Request is provided
    let token = null;
    if (req) {
        const authHeader = req.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    // 2. Instantiate the scoped client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            },
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // Silent fail if called from a Server Component during render
                    }
                },
                remove(name: string, options: any) {
                    try {
                        cookieStore.delete({ name, ...options });
                    } catch (error) {
                        // Silent fail
                    }
                },
            }
        }
    );

    // 3. Optional: Auto-validate user and throw if unauthorized
    // This simplifies route logic significantly.
    const { data: { user }, error } = token 
        ? await supabase.auth.getUser(token) 
        : await supabase.auth.getUser();

    if (error || !user) {
        throw new Error('Unauthorized');
    }

    return { supabase, user };
}
