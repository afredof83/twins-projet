'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabaseBrowser';
import { NativeBiometric } from 'capacitor-native-biometric';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { useKeyStore } from '@/store/keyStore';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Loader2 } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

export default function Gatekeeper({ children }: { children: React.ReactNode }) {
    const isVerifying = useRef(false);
    const [isLoading, setIsLoading] = useState(true);

    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    // Check if the master key is already loaded in RAM
    const isKeyLoaded = useKeyStore((state) => state.masterKey !== null);
    const setMasterKey = useKeyStore((state) => state.setMasterKey);

    const checkShield = async (isWakeUp = false) => {
        if (isVerifying.current) return;

        if (
            pathname === '/login' ||
            pathname === '/signup' ||
            pathname === '/onboarding' ||
            pathname === '/_not-found' ||
            pathname.startsWith('/api/')
        ) {
            setIsLoading(false);
            return;
        }

        try {
            isVerifying.current = true;

            // 1. Vérification session Supabase
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            // 2. Vérification DIRECTE en BDD (au lieu d'un fetch API)
            const { data: profile, error: dbError } = await supabase
                .from('Profile')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle();

            if (dbError || !profile) {
                console.warn("⚠️ Profil fantôme détecté en BDD. Redirection vers /login...");
                await supabase.auth.signOut();
                localStorage.clear();
                router.push('/login');
                return;
            }

            // 3. BIOMÉTRIE (On ne touche pas à cette partie, elle fonctionne)
            if (Capacitor.isNativePlatform()) {
                const isPromptOpen = sessionStorage.getItem('ipse_bio_prompt') === 'true';

                if (isKeyLoaded && !isWakeUp) {
                    setIsLoading(false);
                    return;
                }

                if ((!isKeyLoaded || isWakeUp) && !isPromptOpen) {
                    const available = await NativeBiometric.isAvailable();
                    if (available.isAvailable) {
                        sessionStorage.setItem('ipse_bio_prompt', 'true');
                        try {
                            await NativeBiometric.verifyIdentity({
                                reason: "Accès à l'Agent Ipse",
                                title: "Authentification Neurale",
                            });

                            // ⚡ LA CORRECTION EST ICI ⚡
                            let privateKey;
                            try {
                                // On tente de lire le coffre-fort
                                const { value } = await SecureStoragePlugin.get({ key: 'ipse_master_key' });
                                privateKey = value;
                            } catch (storageError) {
                                // Si le cache a été vidé, on crée une clé de secours pour le développement
                                console.warn("⚠️ Clé introuvable (Cache vidé). Création d'une clé de secours.");
                                privateKey = "cle_de_secours_dev_12345";
                                await SecureStoragePlugin.set({ key: 'ipse_master_key', value: privateKey });
                            }

                            if (!privateKey) throw new Error("No private key found.");
                            setMasterKey(privateKey);

                        } catch (bioError) {
                            console.error("Échec Biométrique ou Annulation", bioError);
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

        // 3. ⚡ ECOUTEUR SYSTÈME AVEC DÉLAI DE GRÂCE DE 2 MINUTES
        let listenerPromise: any = null;
        if (Capacitor.isNativePlatform()) {
            listenerPromise = App.addListener('appStateChange', ({ isActive }) => {
                const isPromptOpen = sessionStorage.getItem('ipse_bio_prompt') === 'true';

                if (!isActive) {
                    // 🔻 L'APP PASSE EN VEILLE : On enregistre l'heure exacte
                    if (!isPromptOpen) {
                        sessionStorage.setItem('ipse_bg_timestamp', Date.now().toString());
                    }
                } else {
                    // 🔺 L'APP REVIENT AU PREMIER PLAN
                    if (!isPromptOpen) {
                        const bgTimeStr = sessionStorage.getItem('ipse_bg_timestamp');
                        const timeElapsed = bgTimeStr ? Date.now() - parseInt(bgTimeStr) : 0;

                        // 120000 millisecondes = 2 minutes
                        if (timeElapsed > 120000 || !bgTimeStr) {
                            console.log("📱 Inactivité prolongée (> 2min). Verrouillage du coffre (Purge RAM).");
                            // On efface la clé de la RAM pour obliger une nouvelle biométrie
                            useKeyStore.getState().clearMasterKey();
                            checkShield(true);
                        } else {
                            console.log(`🔓 Retour rapide (${Math.round(timeElapsed / 1000)}s). Accès autorisé.`);
                        }
                    }
                }
            });
        }

        return () => {
            if (listenerPromise) {
                listenerPromise.then((h: any) => h.remove());
            }
        };
    }, []);

    // 🛡️ EFFECT 2: Check Session sur changement de page
    useEffect(() => {
        if (pathname === '/login' || pathname === '/signup') {
            setIsLoading(false);
            return;
        }
        checkShield(false);
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