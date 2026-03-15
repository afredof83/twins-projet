'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import ThemeTransition from '@/app/components/ThemeTransition';
import { usePrismStore } from '@/store/prismStore';

export type PrismType = 'WORK' | 'HOBBY' | 'DATING';

interface Profile {
  id: string;
  type: PrismType;
  display_name: string;
  avatar_url: string;
}

interface PrismContextType {
  activePrism: PrismType;
  activeProfile: Profile | null;
  switchPrism: (prism: PrismType) => Promise<void>;
  isLoading: boolean;
  prismProfiles: Profile[];
}

const PrismContext = createContext<PrismContextType | undefined>(undefined);

export function PrismProvider({ children }: { children: React.ReactNode }) {
  const { currentPrism, setPrism } = usePrismStore();
  const [prismProfiles, setPrismProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Alias pour la rétrocompatibilité si besoin
  const activePrism = currentPrism;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Initialisation : Charger les 3 profils du Triad
  useEffect(() => {
    async function initPrisms() {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, type, display_name, avatar_url')
        .eq('user_id', user.id);

      if (profiles && profiles.length > 0) {
        setPrismProfiles(profiles);
        // On essaye de trouver le prisme actif stocké ou par défaut WORK
        const storedPrism = localStorage.getItem('ipse_active_prism') as PrismType;
        const initial = profiles.find(p => p.type === (storedPrism || 'WORK')) || profiles[0];
        if (initial) {
          setPrism(initial.type);
          setActiveProfile(initial);
          document.documentElement.className = `theme-${initial.type.toLowerCase()}`;
        }
      }
      setIsLoading(false);
    }
    initPrisms();
  }, [supabase, setPrism]);

  // Sync activeProfile when currentPrism changes
  useEffect(() => {
    const profile = prismProfiles.find(p => p.type === currentPrism);
    if (profile) {
      setActiveProfile(profile);
      document.documentElement.className = `theme-${currentPrism.toLowerCase()}`;
      localStorage.setItem('ipse_active_prism', currentPrism);
    }
  }, [currentPrism, prismProfiles]);

  // 2. Changement de Prisme
  const switchPrism = async (newPrism: PrismType) => {
    if (newPrism === currentPrism) return;
    const targetProfile = prismProfiles.find(p => p.type === newPrism);
    if (!targetProfile) return;

    // L'animation ThemeTransition se déclenche via activePrism.
    
    // On attend le pic de l'animation de cercle (400ms sur 800ms)
    setTimeout(async () => {
      setPrism(newPrism);
      await supabase.rpc('set_config', { name: 'app.current_prism', value: newPrism });
    }, 400);

    // Gestion des clés E2EE
    const vault = JSON.parse(localStorage.getItem('ipse_jwt_vault') || '{}');
    if (vault[targetProfile.id]) {
      console.log(`🔑 Clé du prisme ${newPrism} chargée.`);
    }
  };

  const value = useMemo(() => ({
    activePrism: currentPrism,
    activeProfile,
    switchPrism,
    isLoading,
    prismProfiles
  }), [currentPrism, activeProfile, prismProfiles, isLoading]);

  return (
    <PrismContext.Provider value={value}>
      <ThemeTransition prism={activePrism} />
      <div className={`prism-content rounded-[var(--radius)] min-h-screen transition-all duration-700 ease-in-out`}>
        {children}
      </div>
    </PrismContext.Provider>
  );
}

export const usePrismManager = () => {
  const context = useContext(PrismContext);
  if (!context) throw new Error('usePrismManager must be used within a PrismProvider');
  return context;
};
