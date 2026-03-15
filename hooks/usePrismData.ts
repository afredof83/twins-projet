'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrismStore, PrismType } from '@/store/prismStore';

interface UsePrismDataOptions<T> {
    fetchFn: (prism: PrismType) => Promise<T>;
    initialData?: T;
}

/**
 * Custom hook for reactive data fetching across identity prisms.
 * Implements a "Stale-While-Revalidate" pattern to avoid visual jumps.
 */
export function usePrismData<T>({ fetchFn, initialData }: UsePrismDataOptions<T>) {
    const { currentPrism } = usePrismStore();
    const [data, setData] = useState<T | undefined>(initialData);
    const [isLoading, setIsLoading] = useState(true);
    const [isRevalidating, setIsRevalidating] = useState(false);
    
    // Use ref to track the latest prism to avoid race conditions
    const latestPrism = useRef(currentPrism);

    const loadData = useCallback(async (prism: PrismType) => {
        setIsRevalidating(true);
        try {
            const result = await fetchFn(prism);
            // Only update if this is still the results for the latest active prism
            if (prism === latestPrism.current) {
                setData(result);
            }
        } catch (error) {
            console.error(`[usePrismData] Error fetching data for ${prism}:`, error);
        } finally {
            if (prism === latestPrism.current) {
                setIsLoading(false);
                setIsRevalidating(false);
            }
        }
    }, [fetchFn]);

    useEffect(() => {
        latestPrism.current = currentPrism;
        loadData(currentPrism);
    }, [currentPrism, loadData]);

    return {
        data,
        isLoading,
        isRevalidating,
        currentPrism,
        refresh: () => loadData(currentPrism),
    };
}
