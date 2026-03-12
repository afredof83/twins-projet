'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { PrismType } from '@/components/providers/PrismProvider';

interface ThemeTransitionProps {
    prism: PrismType;
}

const THEME_COLORS = {
    WORK: '#0F172A',
    HOBBY: '#064E3B',
    DATING: '#2E1065',
};

export default function ThemeTransition({ prism }: ThemeTransitionProps) {
    const [displayPrism, setDisplayPrism] = useState(prism);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (prism !== displayPrism) {
            setIsAnimating(true);
            const timer = setTimeout(() => {
                setDisplayPrism(prism);
                setIsAnimating(false);
            }, 800); // Durée de l'animation
            return () => clearTimeout(timer);
        }
    }, [prism, displayPrism]);

    return (
        <AnimatePresence>
            {isAnimating && (
                <motion.div
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 4, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ 
                        duration: 0.8, 
                        ease: [0.4, 0, 0.2, 1], // Cubic bezier pour un effet premium
                    }}
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        width: '100vmax',
                        height: '100vmax',
                        marginLeft: '-50vmax',
                        marginTop: '-50vmax',
                        backgroundColor: THEME_COLORS[prism],
                        borderRadius: '50%',
                        zIndex: 9999,
                        pointerEvents: 'none',
                        backdropFilter: 'blur(10px)',
                    }}
                />
            )}
        </AnimatePresence>
    );
}
