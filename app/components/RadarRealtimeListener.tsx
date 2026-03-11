'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabaseBrowser';

interface RadarRealtimeListenerProps {
    onUpdate: () => void;
    currentUserId: string;
}

export default function RadarRealtimeListener({ onUpdate, currentUserId }: RadarRealtimeListenerProps) {
    useEffect(() => {
        const supabase = createClient();

        // On écoute tout changement sur Connection et Opportunity 
        // Le filtrage se fera par l'accès RLS (l'utilisateur ne reçoit que ce qu'il peut voir)
        const channel = supabase
            .channel(`radar_realtime_${currentUserId}`)
            .on('postgres_changes', {
                event: '*', // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'Connection'
            }, (payload: any) => {
                console.log('🔔 [Realtime] Connection update detected', payload);
                onUpdate();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'Opportunity'
            }, (payload: any) => {
                console.log('🔔 [Realtime] Opportunity update detected', payload);
                onUpdate();
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'Message',
                filter: `receiverId=eq.${currentUserId}`
            }, (payload: any) => {
                console.log('🔔 [Realtime] New message detected for Radar', payload);
                onUpdate();
            })
            .subscribe((status: any) => {
                console.log(`📡 [Realtime] Status for ${currentUserId}:`, status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, onUpdate]);

    return null;
}
