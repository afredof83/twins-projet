'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';

const Globe = dynamic(() => import('react-globe.gl'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full text-cyan-900 animate-pulse text-[10px]">INITIALISATION HOLOGRAMME...</div>
});

interface TacticalGlobeProps {
    mode: 'IDLE' | 'SCANNING' | 'LOCKED' | 'AUDIT';
    targetCoordinates?: [number, number] | null;
}

export default function TacticalGlobe({ mode, targetCoordinates }: TacticalGlobeProps) {
    const globeEl = useRef<any>(null);
    const [mounted, setMounted] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const arcsData = useMemo(() => [
        { startLat: 48.8566, startLng: 2.3522, endLat: 40.7128, endLng: -74.0060, color: '#06b6d4' },
        { startLat: 48.8566, startLng: 2.3522, endLat: 35.6762, endLng: 139.6503, color: '#a855f7' },
        { startLat: 40.7128, startLng: -74.0060, endLat: 34.0522, endLng: -118.2437, color: '#10b981' }
    ], []);

    useEffect(() => {
        setMounted(true);
        setDimensions({ width: window.innerWidth, height: window.innerHeight });

        const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!globeEl.current) return;
        const controls = globeEl.current.controls();
        if (!controls) return;

        controls.enableZoom = false;
        controls.enablePan = false;

        // Mode logic
        switch (mode) {
            case 'IDLE':
                controls.autoRotate = true;
                controls.autoRotateSpeed = 0.5;
                break;
            case 'SCANNING':
                controls.autoRotate = true;
                controls.autoRotateSpeed = 5.0; // Fast rotation
                break;
            case 'LOCKED':
            case 'AUDIT':
                controls.autoRotate = false;
                if (targetCoordinates) {
                    globeEl.current.pointOfView({ lat: targetCoordinates[0], lng: targetCoordinates[1], altitude: 1.5 }, 1000);
                }
                break;
        }
    }, [mode, targetCoordinates, mounted]);

    if (!mounted) return null;

    return (
        <div className="w-full h-full absolute inset-0 brightness-150 md:brightness-100">
            <Globe
                ref={globeEl}
                backgroundColor="rgba(0,0,0,0)"
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                atmosphereColor="#22d3ee"
                atmosphereAltitude={0.25}
                arcsData={arcsData}
                arcColor="color"
                arcDashLength={0.5}
                arcDashGap={1}
                arcDashAnimateTime={2000}
                arcStroke={0.5}
                width={dimensions.width}
                height={dimensions.height}
            />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/50 md:from-black via-transparent to-black/40 md:to-black/40"></div>
        </div>
    );
}
