'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// On définit le type de notre message
type Message = {
    id: string;
    content: string;
    createdAt: Date | string;
    senderId: string;
    receiverId: string;
};

export default function RealtimeChat({
    initialMessages,
    currentUserId,
    receiverId,
}: {
    initialMessages: Message[];
    currentUserId: string;
    receiverId: string;
}) {
    // On charge l'historique initial
    const [messages, setMessages] = useState<Message[]>(initialMessages);

    // On initialise le client Supabase pour le navigateur
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        console.log("Agent: Écoute réseau activée...");

        const channel = supabase
            .channel('public:Message') // Nom explicite du channel
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'Message' },
                (payload) => {
                    console.log('🔥 [REALTIME PAYLOAD REÇU]', payload);

                    const newMessage = payload.new as any;

                    // 1. Capture de la casse PostgreSQL vs Prisma (toutes variations possibles)
                    const incomingSender = newMessage.senderId || newMessage.senderid || newMessage.sender_id;
                    const incomingReceiver = newMessage.receiverId || newMessage.receiverid || newMessage.receiver_id;

                    console.log(`[DIAGNOSTIC] Clés exactes reçues:`, Object.keys(newMessage));
                    console.log(`[SCAN] Message entrant -> De: ${incomingSender} Pour: ${incomingReceiver}`);

                    // 2. Logique de filtrage stricte
                    if (
                        (incomingSender === currentUserId && incomingReceiver === receiverId) ||
                        (incomingSender === receiverId && incomingReceiver === currentUserId)
                    ) {
                        console.log('✅ ACCEPTÉ : Le message rejoint le chat.');
                        setMessages((prev) => {
                            if (prev.find((m) => m.id === newMessage.id)) return prev;

                            return [...prev, {
                                id: newMessage.id,
                                content: newMessage.content,
                                createdAt: newMessage.createdAt || newMessage.created_at || newMessage.createdat,
                                senderId: incomingSender,
                                receiverId: incomingReceiver
                            }];
                        });
                    } else {
                        console.log('❌ REJETÉ : Ce message appartient à un autre chat.');
                    }
                }
            )
            .subscribe((status, err) => {
                console.log('📡 [REALTIME STATUS]', status);
                if (err) console.error('❌ [REALTIME ERROR]', err);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, currentUserId, receiverId]);

    return (
        <div className="flex-1 overflow-y-auto py-6 space-y-4">
            {messages.length === 0 ? (
                <div className="text-center text-slate-500 font-mono text-xs mt-10">
                    DÉBUT DE LA TRANSMISSION...
                </div>
            ) : (
                messages.map((msg) => {
                    const isMe = msg.senderId === currentUserId;
                    const date = new Date(msg.createdAt);
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl backdrop-blur-md border ${isMe
                                ? 'bg-blue-500/10 border-blue-500/20 text-blue-50 rounded-tr-sm'
                                : 'bg-white/5 border-white/10 text-slate-300 rounded-tl-sm'
                                }`}>
                                <p className="text-sm">{msg.content}</p>
                                <span className="text-[9px] font-mono opacity-50 mt-2 block uppercase">
                                    {date.toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
