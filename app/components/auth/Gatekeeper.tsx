'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabaseBrowser'; // Ton import exact
import { NativeBiometric } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Loader2 } from 'lucide-react';

export default function Gatekeeper({ children }: { children: React.ReactNode }) {
    const isVerifying = useRef(false); // Anti-boucle de vérification
    const hasUnlocked = useRef(false); // ⚡ MÉMOIRE DU COFFRE-FORT
    const [isLoading, setIsLoading] = useState(true);

    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    useEffect(() => {
        const checkShield = async (isWakeUp = false) => {
            if (isVerifying.current) return;

            // Pages publiques
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
                isVerifying.current = true;

                // 1. Check Session & BDD (Silencieux à chaque changement de page)
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("No session");

                const response = await fetch('/api/auth/sync');
                if (!response.ok) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    const retry = await fetch('/api/auth/sync');
                    if (!retry.ok) {
                        await supabase.auth.signOut();
                        localStorage.clear();
                        throw new Error("Profile ghost");
                    }
                }

                // 2. BIOMÉTRIE (Seulement si pas encore déverrouillé, ou si retour de veille)
                if (Capacitor.isNativePlatform() && (!hasUnlocked.current || isWakeUp)) {
                    const available = await NativeBiometric.isAvailable();
                    if (available.isAvailable) {
                        await NativeBiometric.verifyIdentity({
                            reason: "Accès à votre Agent Ipse",
                            title: "Sécurité Biométrique",
                        });
                        hasUnlocked.current = true; // ⚡ ON MÉMORISE LE DÉVERROUILLAGE
                    }
                }

                setIsLoading(false);
            } catch (err) {
                console.error("🚨 Gatekeeper Intercept:", err);
                router.replace('/login');
            } finally {
                setTimeout(() => { isVerifying.current = false; }, 1000);
            }
        };

        checkShield();

        // 3. ECOUTEUR SYSTÈME : Si l'app revient du background
        let listenerPromise: any = null;
        if (Capacitor.isNativePlatform()) {
            listenerPromise = App.addListener('appStateChange', ({ isActive }) => {
                if (isActive) {
                    hasUnlocked.current = false; // ⚡ ON REFERME LE COFFRE
                    checkShield(true); // On force la demande d'empreinte
                }
            });
        }

        return () => {
            if (listenerPromise) {
                listenerPromise.then((h: any) => h.remove());
            }
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

    return <> {children}</>;
}
