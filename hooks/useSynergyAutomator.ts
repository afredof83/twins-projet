import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client'; // Pointing to the existing browser client

export function useSynergyAutomator(opportunityId: string | null) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [quotaInfo, setQuotaInfo] = useState<{remaining: number, resetMinutes: number} | null>(null);
    const supabase = createClient();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!opportunityId) return;

        // 1. Écoute en temps réel de la péremption (Status: PENDING)
        const channel = supabase
            .channel(`sync-${opportunityId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'opportunities',
                    filter: `id=eq.${opportunityId}`,
                },
                (payload: any) => {
                    if (payload.new.status === 'PENDING') {
                        triggerSync();
                    }
                }
            )
            .subscribe();

        // 2. Logique de synchronisation avec Debounce
        const triggerSync = () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            
            timeoutRef.current = setTimeout(async () => {
                setIsSyncing(true);
                try {
                    const res = await fetch('/api/synergy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ opportunityId }),
                    });
                    
                    const isJson = res.headers.get('content-type')?.includes('application/json');
                    const data = isJson ? await res.json() : null;

                    if (res.status === 429) {
                        setQuotaInfo({
                            remaining: 0,
                            resetMinutes: data.quota.reset_minutes
                        });
                        return;
                    }

                    if (res.ok) {
                        const remaining = res.headers.get('X-RateLimit-Remaining');
                        const resetMinutes = res.headers.get('X-RateLimit-Reset');
                        
                        if (remaining && resetMinutes) {
                            setQuotaInfo({
                                remaining: parseInt(remaining),
                                resetMinutes: parseInt(resetMinutes)
                            });
                        } else if (data?.quota) {
                            setQuotaInfo({
                                remaining: data.quota.remaining,
                                resetMinutes: data.quota.reset_minutes
                            });
                        }
                    }
                    
                    if (!res.ok && res.status !== 429) throw new Error('Sync failed');
                } catch (err) {
                    console.error("❌ Auto-sync error:", err);
                } finally {
                    setIsSyncing(false);
                }
            }, 3000); // 3 secondes de réflexion avant de lancer l'IA
        };

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            supabase.removeChannel(channel);
        };
    }, [opportunityId, supabase]);

    return { isSyncing, quotaInfo };
}
