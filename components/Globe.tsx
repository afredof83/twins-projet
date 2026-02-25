'use client'

import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

// L'interface pour recevoir les coordonnées de l'IA
export interface TargetNode {
    name: string;
    lat: number;
    lng: number;
}

export default function BackgroundGlobe({ targets = [] }: { targets?: TargetNode[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        let currentPhi = 0;
        let currentTheta = 0;
        let targetPhi = 0;
        let targetTheta = 0;

        // 1. Marqueur statique : Toulon (Ta position, toujours affichée)
        const activeMarkers: { location: [number, number]; size: number }[] = [
            { location: [43.12, 5.93], size: 0.03 }
        ];

        // 2. Traitement de la cible IA
        if (targets && targets.length > 0) {
            const t = targets[0];

            // VERIFICATION CRITIQUE : Regarde ta console. Si lng est positif pour le Canada, c'est Mistral qui hallucine.
            console.log("[RADAR] Coordonnées reçues :", t);

            // Ajout du marqueur cible
            activeMarkers.push({ location: [t.lat, t.lng], size: 0.05 });

            // Calibrage exact pour Cobe
            targetPhi = Math.PI - (t.lng * Math.PI) / 180;
            targetTheta = (t.lat * Math.PI) / 180;
        }

        // 3. Initialisation du Globe
        const globe = createGlobe(canvasRef.current, {
            devicePixelRatio: 2,
            width: 920,
            height: 920,
            phi: 0,
            theta: 0,
            dark: 1, // Mode sombre
            diffuse: 1.2,
            mapSamples: 16000,
            mapBrightness: 6,
            baseColor: [1, 1, 1],
            markerColor: [0.1, 1, 0.1], // Vert néon (Mission Control)
            glowColor: [1, 1, 1],
            markers: activeMarkers, // On injecte le tableau mis à jour
            onRender: (state) => {
                if (targets && targets.length > 0) {
                    // Verrouillage sur la cible
                    currentPhi += (targetPhi - currentPhi) * 0.05;
                    currentTheta += (targetTheta - currentTheta) * 0.05;
                } else {
                    // Mode veille : rotation lente
                    currentPhi += 0.002;
                    currentTheta += (0.1 - currentTheta) * 0.05; // Légère inclinaison
                }
                state.phi = currentPhi;
                state.theta = currentTheta;
            }
        });

        // 4. NETTOYAGE CRITIQUE : Détruit l'instance précédente quand targets change
        return () => globe.destroy();
    }, [targets]); // <-- C'EST CETTE LIGNE QUI FAIT APPARAITRE LES MARQUEURS

    return (
        <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-50">
            <canvas
                ref={canvasRef}
                style={{
                    width: 920,
                    height: 920,
                    maxWidth: '100%', // Sécurité anti-débordement sur les petits écrans
                    aspectRatio: '1/1'
                }}
            />
        </div>
    );
}