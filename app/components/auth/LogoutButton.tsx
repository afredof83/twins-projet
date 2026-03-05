'use client';

import { createClient } from '@/lib/supabaseBrowser';
import { LogOut } from 'lucide-react';
import { useState } from 'react';

/**
 * LogoutButton component handles the global logout process.
 * It clears Supabase session, session storage (for biometrics), 
 * local storage, and performs a hard redirect to the login page.
 */
export default function LogoutButton() {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const supabase = createClient();

    const handleLogout = async () => {
        setIsLoggingOut(true);

        try {
            // 1. Tuer la session Supabase sur le serveur
            await supabase.auth.signOut();

            // 2. ⚡ Purger la mémoire du coffre-fort biométrique
            sessionStorage.clear();

            // 3. Purger les données locales éventuelles
            localStorage.clear();

            // 4. Hard Redirect : on force le rechargement de la page vers /login
            // Cela détruit toute la mémoire RAM de Next.js et des composants React
            window.location.href = '/login';

        } catch (error) {
            console.error("Erreur lors de la déconnexion:", error);
            setIsLoggingOut(false);
        }
    };

    return (
        <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center justify-center gap-3 w-full px-4 py-4 mt-8 text-red-500 bg-red-500/10 rounded-2xl border border-red-500/20 hover:bg-red-500/20 active:scale-95 transition-all disabled:opacity-50"
        >
            <LogOut size={20} className={isLoggingOut ? "animate-pulse" : ""} />
            <span className="font-bold tracking-widest uppercase text-sm">
                {isLoggingOut ? "Purge en cours..." : "Déconnexion Spatiale"}
            </span>
        </button>
    );
}
