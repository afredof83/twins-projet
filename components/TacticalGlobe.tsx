'use client'

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Import dynamique sécurisé pour Next.js
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

export interface TargetNode {
    name: string;
    lat: number;
    lng: number;
}

export default function TacticalGlobe({ targets }: { targets: TargetNode[] }) {
    const globeRef = useRef<any>(null);
    const [isReady, setIsReady] = useState(false);

    // Ta base de tir (Toulon)
    const baseLocation = { lat: 43.12, lng: 5.93, name: "BASE CORTEX" };

    // 1. Le Moteur de Ciblage (Caméra)
    useEffect(() => {
        if (!globeRef.current || !isReady) return;

        if (targets.length > 0) {
            console.log("🚀 [RADAR] Verrouillage balistique sur :", targets[0].name);

            // On laisse 100ms au moteur 3D pour dessiner le laser AVANT de bouger la caméra
            setTimeout(() => {
                globeRef.current.pointOfView({
                    lat: targets[0].lat,
                    lng: targets[0].lng,
                    altitude: 1.5
                }, 2000);
            }, 100);

        } else {
            setTimeout(() => {
                globeRef.current.pointOfView({ lat: baseLocation.lat, lng: baseLocation.lng, altitude: 2 }, 2000);
            }, 100);
        }
    }, [targets, isReady]);

    // 2. Préparation des munitions (Arcs et Anneaux)
    const arcsData = targets.map(target => ({
        startLat: baseLocation.lat,
        startLng: baseLocation.lng,
        endLat: target.lat,
        endLng: target.lng,
        color: ['#00ffff', '#ff0044'] // Tir de Cyan vers Rouge
    }));

    const ringsData = targets.map(target => ({
        lat: target.lat,
        lng: target.lng,
        maxR: 5,
        propagationSpeed: 2,
        repeatPeriod: 1000
    }));

    const labelsData = [baseLocation, ...targets];

    return (
        <div className="w-full h-[500px] border border-cyan-800 rounded overflow-hidden relative bg-[#050505]">

            {/* Interface HUD tactique */}
            <div className="absolute top-2 left-2 z-10 text-cyan-500 font-mono text-xs">
                <span className="animate-pulse">&gt; CORTEX GEOLOCATION ACTIVE</span>
                <br />
                &gt; CIBLES VÉROUILLÉES : {targets ? targets.length : 0}
            </div>

            <Globe
                ref={globeRef}
                globeImageUrl="https://unpkg.com/three-globe/example/img/earth-dark.jpg"

                onGlobeReady={() => {
                    console.log("✅ [RADAR] Moteur 3D En Ligne");
                    setIsReady(true);
                }}

                // --- ARMEMENT LASER (Arcs) ---
                // Force un trait plein, sans trous, sans clignotement, épaisseur maximum
                arcsData={arcsData}
                arcColor={(d: any) => d.color}
                arcDashLength={1}
                arcDashGap={0}
                arcDashAnimateTime={0}
                arcStroke={1}

                // --- ONDES DE CHOC (Rings) ---
                ringsData={ringsData}
                ringColor={() => '#ff0044'}
                ringMaxRadius={(d: any) => d.maxR}
                ringPropagationSpeed={(d: any) => d.propagationSpeed}
                ringRepeatPeriod={(d: any) => d.repeatPeriod} // LE CORRECTIF EST ICI

                // --- ÉTIQUETTES (Labels) ---
                labelsData={labelsData}
                labelLat={(d: any) => d.lat}
                labelLng={(d: any) => d.lng}
                labelText={(d: any) => d.name}
                labelSize={1.5}
                labelDotRadius={0.5}
                labelColor={(d: any) => d.name === "BASE CORTEX" ? '#00ffff' : '#ff0044'}
                labelResolution={2}

                backgroundColor="rgba(0,0,0,0)"
            />
        </div>
    );
}