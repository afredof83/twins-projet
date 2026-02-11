'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Import dynamique pour éviter l'erreur "window is not defined" (Next.js SSR)
const Globe = dynamic(() => import('react-globe.gl'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full text-cyan-900 animate-pulse text-[10px]">INITIALISATION HOLOGRAMME...</div>
});

export default function ShadowGlobe({ onLocationChange }: { onLocationChange?: (city: string) => void }) {
    const globeEl = useRef<any>(null);
    const [mounted, setMounted] = useState(false);

    // Données simulées (Arcs de connexion)
    const arcsData = useMemo(() => [
        { startLat: 48.8566, startLng: 2.3522, endLat: 40.7128, endLng: -74.0060, color: '#06b6d4' }, // Paris -> NYC
        { startLat: 48.8566, startLng: 2.3522, endLat: 35.6762, endLng: 139.6503, color: '#a855f7' }, // Paris -> Tokyo
        { startLat: 40.7128, startLng: -74.0060, endLat: 34.0522, endLng: -118.2437, color: '#10b981' } // NYC -> LA
    ], []);

    useEffect(() => {
        setMounted(true);

        const checkControls = setInterval(() => {
            if (globeEl.current) {
                // CONTROLS : VERROUILLAGE
                const controls = globeEl.current.controls();
                if (controls) {
                    controls.enableZoom = false;
                    controls.enablePan = false;
                    controls.enableRotate = false; // Désactive rotation MANUELLE
                    controls.autoRotate = true; // Garde la rotation AUTO
                    controls.autoRotateSpeed = 0.5;
                }
            }
        }, 100); // Check rapide au début
        return () => clearInterval(checkControls);
    }, []);

    if (!mounted) return null;

    return (
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-xl cursor-move">
            <Globe
                ref={globeEl}
                backgroundColor="rgba(0,0,0,0)" // Transparent pour voir le fond du dashboard

                // Apparence du Globe
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg" // Version Nuit
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

                // Atmosphère (Plus lumineuse pour l'effet hologramme)
                atmosphereColor="#22d3ee" // Cyan plus clair
                atmosphereAltitude={0.25} // Halo plus grand

                // Arcs (Connexions)
                arcsData={arcsData}
                arcColor="color"
                arcDashLength={0.5}
                arcDashGap={1}
                arcDashAnimateTime={2000}
                arcStroke={0.5}

                width={300} // Taille ajustée pour le conteneur - réduite de 400 à 300 pour mieux s'adapter au dashboard
                height={300}
            />

            {/* Overlay Décoratif */}
            <div className="absolute inset-0 pointer-events-none rounded-xl border border-cyan-900/30 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]"></div>
        </div>
    );
}
