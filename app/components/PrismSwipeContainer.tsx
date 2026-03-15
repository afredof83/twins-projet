'use client';

import React from 'react';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { usePrismStore } from '@/store/prismStore';

interface PrismSwipeContainerProps {
    children: React.ReactNode;
}

export default function PrismSwipeContainer({ children }: PrismSwipeContainerProps) {
    const { currentPrism, nextPrism, prevPrism } = usePrismStore();

    const handleDragEnd = (event: any, info: PanInfo) => {
        const threshold = 100; // Seuil de swipe en pixels
        if (info.offset.x < -threshold) {
            nextPrism();
        } else if (info.offset.x > threshold) {
            prevPrism();
        }
    };

    return (
        <div 
            className="relative w-full overflow-hidden"
            style={{ touchAction: 'pan-y' }} // Autorise le scroll vertical natif
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentPrism}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.4}
                    onDragEnd={handleDragEnd}
                    initial={{ x: 0, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                    }}
                    className="w-full min-h-screen"
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
