'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabaseBrowser';
import { NativeBiometric } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function Gatekeeper({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    useEffect(() => {
        const checkShield = async () => {
            // 1. Pages publiques + routes système : On laisse circuler
            if (
                pathname === '/login' ||
                pathname === '/profile/new' ||
                pathname === '/profile/unlock' ||
                pathname === '/auth/callback' ||
                pathname === '/_not-found' ||
                pathname.startsWith('/api/')
            ) {
                setIsLoading(false);
                return;
            }

            try {
                // 2. Vérification Session locale (Token)
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("No session");

                // 3. VÉRIFICATION DE LA MATRICE (Prisma Check)
                const response = await fetch('/api/auth/sync');
                if (!response.ok) {
                    // ⚡ ANTIGRAVITY : Si c'est un nouveau compte, on lui laisse 3 secondes
                    // pour que la BDD se mette à jour avant de déclarer forfait.
                    console.warn("Profil non trouvé, tentative de re-synchronisation...");
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    const retryResponse = await fetch('/api/auth/sync');
                    if (!retryResponse.ok) {
                        await supabase.auth.signOut();
                        localStorage.clear();
                        throw new Error("Profile truly not found after retry");
                    }
                }

                // 4. BIOMÉTRIE (Touch ID / Face ID)
                if (Capacitor.isNativePlatform()) {
                    const available = await NativeBiometric.isAvailable();
                    if (available.isAvailable) {
                        await NativeBiometric.verifyIdentity({
                            reason: "Accès à votre Agent Ipse",
                            title: "Sécurité Biométrique",
                        });
                    }
                }

                setIsLoading(false);
            } catch (err) {
                console.error("🚨 Gatekeeper éjection immédiate.");
                router.replace('/login');
            }
        };

        checkShield();

        // 1. On stocke la promesse du listener
        const listenerPromise = App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
            if (isActive) {
                console.log("🚀 App revient au premier plan. Re-vérification...");
                checkShield();
            }
        });

        // 2. ⚡ NETTOYAGE ANTIGRAVITY
        return () => {
            listenerPromise.then(handle => handle.remove());
        };
    }, [pathname]);

    if (isLoading && pathname !== '/login') {
        return (
            <div className="h-screen w-screen bg-black flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                <p className="text-emerald-500/50 text-xs tracking-widest uppercase">Synchronisation...</p>
            </div>
        );
    }

    return <>{children}</>;
}
