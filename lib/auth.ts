import { createClient } from './supabaseBrowser';

/**
 * Helper to get the current session token on the client side.
 * Useful for Capacitor builds where session must be passed in Authorization header.
 */
export async function getSessionToken(): Promise<string | null> {
    try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
    } catch (error) {
        console.error('Error getting session token:', error);
        return null;
    }
}
