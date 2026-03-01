'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { getAgentName } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import DeleteChannelButton from '@/app/components/DeleteChannelButton';

export default function ActiveChannelsList({ activeChannels, currentUserId }: { activeChannels: any[], currentUserId: string }) {
    const [unreadSenders, setUnreadSenders] = useState<Set<string>>(new Set());

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        // Le Radar Global : On écoute tous les messages qui NOUS sont destinés
        const channel = supabase
            .channel('global_inbox')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'Message',
                filter: `receiverId=eq.${currentUserId}`
            }, (payload) => {
                const newMsg = payload.new;
                // On ajoute l'ID de l'expéditeur dans notre Set des "non lus"
                setUnreadSenders(prev => new Set(prev).add(newMsg.senderId));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUserId, supabase]);

    return (
        <div className="grid gap-4">
            {activeChannels.map((channel: any) => {
                const targetUser = channel.initiatorId === currentUserId ? channel.receiver : channel.initiator;
                // Si l'ID de l'autre participant est dans notre Set, on affiche la pastille
                const hasUnread = unreadSenders.has(targetUser.id);

                return (
                    <div key={channel.id} className="relative p-4 rounded-xl bg-white/[0.02] border border-white/10 flex justify-between items-center hover:border-blue-500/30 transition-colors group">

                        {/* La Pastille Rouge Visuelle (Radar) */}
                        {hasUnread && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)] border-2 border-[#050a0c] z-10 text-[8px] flex items-center justify-center font-bold text-white">
                                !
                            </span>
                        )}

                        <div>
                            <p className={`text-sm font-bold ${hasUnread ? 'text-red-400' : 'text-white'}`}>{getAgentName(targetUser)}</p>
                            <p className="text-xs text-slate-500 font-mono mt-1">ID: {targetUser.id.slice(0, 8)}...</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <DeleteChannelButton connectionId={channel.id} />
                            <Link href={`/chat/${targetUser.id}`} className="p-3 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all group-hover:scale-105">
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                )
            })}
        </div>
    );
}
