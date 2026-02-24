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

    // Mémoire de la position gyroscopique actuelle
    const currentPhi = useRef(0);
    const currentTheta = useRef(0);

    useEffect(() => {
        if (!canvasRef.current) return;

        // 1. Calcul de la destination
        // 1. Calcul de la destination
        let targetPhi = 0;
        let targetTheta = 0;
        let markers: any[] = [];

        if (targets.length > 0) {
            const t = targets[0];

            // NOUVELLE FORMULE BALISTIQUE : 
            // Math.PI - (...) permet de centrer parfaitement n'importe quelle coordonnée (Est ou Ouest)
            targetPhi = Math.PI - (t.lng * Math.PI) / 180;
            targetTheta = (t.lat * Math.PI) / 180;

            // TAILLE RÉDUITE (0.05) : Un point précis et chirurgical, parfait pour Toulon
            markers = [{ location: [t.lat, t.lng], size: 0.05 }];
        } else {
            // Si aucune cible, rotation lente sur l'Europe par défaut
            targetPhi = 4.5;
            targetTheta = 0.5;
        }

        // 2. Initialisation de ton design Cobe
        const globe = createGlobe(canvasRef.current, {
            devicePixelRatio: 2,
            width: 920 * 2,  // +15% de résolution
            height: 920 * 2, // +15% de résolution
            phi: 0,
            theta: 0,
            dark: 1, // Garde tes réglages de couleur ici
            diffuse: 1.2,
            mapSamples: 16000,
            mapBrightness: 6,
            baseColor: [0.3, 0.3, 0.3],
            markerColor: [0, 1, 1], // Point de frappe Cyan
            glowColor: [0.05, 0.05, 0.05],
            markers: markers,

            // 3. Le Moteur Gyroscopique
            onRender: (state) => {
                // Interpolation fluide (Smooth Lerp) : Le globe tourne doucement vers la cible
                currentPhi.current += (targetPhi - currentPhi.current) * 0.05;
                currentTheta.current += (targetTheta - currentTheta.current) * 0.05;

                // Si aucune cible, on ajoute une micro-rotation automatique pour qu'il vive
                if (targets.length === 0) {
                    targetPhi += 0.002;
                }

                state.phi = currentPhi.current;
                state.theta = currentTheta.current;
            },
        });

        return () => globe.destroy();
    }, [targets]);

    return (
        // Les classes `flex items-center justify-center` garantissent le centrage absolu
        <div className="fixed inset-0 w-screen h-screen -z-10 bg-black overflow-hidden flex items-center justify-center pointer-events-none opacity-50">
            <canvas
                ref={canvasRef}
                style={{
                    width: 920,  // +15% de taille physique
                    height: 920, // +15% de taille physique
                    maxWidth: "100%",
                    aspectRatio: "1/1",
                }}
            />
        </div>
    );
}