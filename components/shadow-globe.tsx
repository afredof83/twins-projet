'use client';
import { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';

interface City {
    name: string;
    lat: number;
    long: number;
}

const TECH_HUBS: City[] = [
    { name: 'Tokyo', lat: 35.6762, long: 139.6503 },
    { name: 'San Francisco', lat: 37.7749, long: -122.4194 },
    { name: 'Londres', lat: 51.5074, long: -0.1278 },
    { name: 'Séoul', lat: 37.5665, long: 126.9780 },
    { name: 'Paris', lat: 48.8566, long: 2.3522 },
    { name: 'Dubaï', lat: 25.2048, long: 55.2708 },
    { name: 'Singapour', lat: 1.3521, long: 103.8198 },
    { name: 'New York', lat: 40.7128, long: -74.0060 },
];

interface ShadowGlobeProps {
    onLocationChange?: (city: string) => void;
}

export default function ShadowGlobe({ onLocationChange }: ShadowGlobeProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [currentCity, setCurrentCity] = useState<City>(TECH_HUBS[0]);
    const pointerInteracting = useRef<number | null>(null);
    const pointerInteractionMovement = useRef(0);
    const [r, setR] = useState(0);

    useEffect(() => {
        let phi = 0;
        let width = 0;
        const onResize = () => canvasRef.current && (width = canvasRef.current.offsetWidth);
        window.addEventListener('resize', onResize);
        onResize();

        if (!canvasRef.current) return;

        const globe = createGlobe(canvasRef.current, {
            devicePixelRatio: 2,
            width: width * 2,
            height: width * 2,
            phi: 0,
            theta: 0.3,
            dark: 1,
            diffuse: 1.2,
            mapSamples: 16000,
            mapBrightness: 6,
            baseColor: [0.1, 0.1, 0.2],
            markerColor: [0.8, 0.2, 0.8],
            glowColor: [0.4, 0.1, 0.5],
            markers: [
                // Current location marker (large)
                { location: [currentCity.lat, currentCity.long] as [number, number], size: 0.1 },
                // All tech hub markers (small)
                ...TECH_HUBS.map(city => ({
                    location: [city.lat, city.long] as [number, number],
                    size: 0.04
                }))
            ],
            onRender: (state) => {
                // Auto-rotation
                if (!pointerInteracting.current) {
                    phi += 0.003;
                }
                state.phi = phi + r;

                // Update size on resize
                state.width = width * 2;
                state.height = width * 2;
            }
        });

        setTimeout(() => canvasRef.current && (canvasRef.current.style.opacity = '1'));

        return () => {
            globe.destroy();
            window.removeEventListener('resize', onResize);
        };
    }, [currentCity, r]);

    // Change location every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * TECH_HUBS.length);
            const newCity = TECH_HUBS[randomIndex];

            // Only change if different
            if (newCity.name !== currentCity.name) {
                setCurrentCity(newCity);

                if (onLocationChange) {
                    onLocationChange(newCity.name);
                }
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [currentCity, onLocationChange]);

    return (
        <div className="relative w-full aspect-square">
            <canvas
                ref={canvasRef}
                onPointerDown={(e) => {
                    pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
                    canvasRef.current && (canvasRef.current.style.cursor = 'grabbing');
                }}
                onPointerUp={() => {
                    pointerInteracting.current = null;
                    canvasRef.current && (canvasRef.current.style.cursor = 'grab');
                }}
                onPointerOut={() => {
                    pointerInteracting.current = null;
                    canvasRef.current && (canvasRef.current.style.cursor = 'grab');
                }}
                onMouseMove={(e) => {
                    if (pointerInteracting.current !== null) {
                        const delta = e.clientX - pointerInteracting.current;
                        pointerInteractionMovement.current = delta;
                        setR(delta / 200);
                    }
                }}
                onTouchMove={(e) => {
                    if (pointerInteracting.current !== null && e.touches[0]) {
                        const delta = e.touches[0].clientX - pointerInteracting.current;
                        pointerInteractionMovement.current = delta;
                        setR(delta / 100);
                    }
                }}
                style={{
                    width: '100%',
                    height: '100%',
                    cursor: 'grab',
                    contain: 'layout paint size',
                    opacity: 0,
                    transition: 'opacity 1s ease'
                }}
            />

            {/* Current Location Indicator */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-purple-900/90 border border-purple-500 px-4 py-2 rounded backdrop-blur-sm">
                <div className="text-xs text-purple-300 font-mono">
                    📍 NŒUD ACTIF
                </div>
                <div className="text-sm text-purple-100 font-bold font-mono">
                    {currentCity.name.toUpperCase()}
                </div>
            </div>
        </div>
    );
}
