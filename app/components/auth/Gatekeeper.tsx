'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabaseBrowser';
import { NativeBiometric } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Loader2 } from 'lucide-react';

export default function Gatekeeper({ children }: { children: React.ReactNode }) {
    const isVerifying = useRef(false);
    const [isLoading, setIsLoading] = useState(true);

    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    const checkShield = async (isWakeUp = false) => {
        // Anti-rebond d'exécution
        if (isVerifying.current) return;

        // Pages publiques
        if (
            pathname === '/login' ||
            pathname === '/onboarding' ||
            pathname === '/_not-found' ||
            pathname.startsWith('/api/')
        ) {
            setIsLoading(false);
            return;
        }

        try {
            isVerifying.current = true;

            // 1. Vérification Supabase & BDD
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            // Optionnel: sync API seulement si on n'est pas déjà en train de charger
            const response = await fetch('/api/auth/sync');
            if (!response.ok) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const retry = await fetch('/api/auth/sync');
                if (!retry.ok) {
                    await supabase.auth.signOut();
                    localStorage.clear();
                    throw new Error("Profile ghost");
                }
            }

            // 2. ⚡ BIOMÉTRIE (Basée sur le SessionStorage)
            if (Capacitor.isNativePlatform()) {
                const hasUnlocked = sessionStorage.getItem('ipse_unlocked') === 'true';
                const isPromptOpen = sessionStorage.getItem('ipse_bio_prompt') === 'true';

                // 🚨 CORRECTION: Si on est déjà déverrouillé et qu'on change juste de page, on SKIP la biométrie
                if (hasUnlocked && !isWakeUp) {
                    setIsLoading(false);
                    return;
                }

                // Si on n'a pas encore déverrouillé OU que c'est un retour de veille
                if ((!hasUnlocked || isWakeUp) && !isPromptOpen) {
                    const available = await NativeBiometric.isAvailable();
                    if (available.isAvailable) {
                        sessionStorage.setItem('ipse_bio_prompt', 'true');

                        try {
                            await NativeBiometric.verifyIdentity({
                                reason: "Accès à votre Agent Ipse",
                                title: "Sécurité Biométrique",
                            });
                            sessionStorage.setItem('ipse_unlocked', 'true');
                        } catch (bioError) {
                            console.error("Biometric failed", bioError);
                            router.replace('/login');
                            return;
                        } finally {
                            setTimeout(() => {
                                sessionStorage.setItem('ipse_bio_prompt', 'false');
                            }, 1000);
                        }
                    }
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

    // 🛡️ EFFECT 1: Initialisation et Listeners (UNE SEULE FOIS)
    useEffect(() => {
        checkShield(false);

        let listener: any = null;
        if (Capacitor.isNativePlatform()) {
            listener = App.addListener('appStateChange', ({ isActive }) => {
                if (isActive) {
                    const isPromptOpen = sessionStorage.getItem('ipse_bio_prompt') === 'true';
                    if (!isPromptOpen) {
                        console.log("📱 App Wake Up. Re-verrouillage.");
                        sessionStorage.setItem('ipse_unlocked', 'false');
                        checkShield(true);
                    }
                }
            });
        }

        return () => {
            if (listener) listener.then((h: any) => h.remove());
        };
    }, []);

    // 🛡️ EFFECT 2: Check Session sur changement de page (SANS boucle biométrique)
    useEffect(() => {
        checkShield(false);
    }, [pathname]); // ⚠️ pathname ici fait que Next re-lance l'effet à chaque page

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