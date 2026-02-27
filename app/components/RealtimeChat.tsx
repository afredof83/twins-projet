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
            .channel('messages-channel')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'Message' },
                (payload) => {
                    const rawMessage = payload.new as any;

                    // 1. On récupère les IDs et on force tout en minuscules pour éviter les conflits
                    const incSender = String(rawMessage.senderId || rawMessage.senderid).toLowerCase();
                    const incReceiver = String(rawMessage.receiverId || rawMessage.receiverid).toLowerCase();
                    const localMe = String(currentUserId).toLowerCase();
                    const localTarget = String(receiverId).toLowerCase();

                    // 2. Le Rapport de Scan dans ta console (F12)
                    console.log(`[SCAN] Moi localement   : ${localMe}`);
                    console.log(`[SCAN] Cible localement : ${localTarget}`);
                    console.log(`[SCAN] Message entrant -> De: ${incSender} Pour: ${incReceiver}`);

                    // 3. La condition assouplie
                    const isForThisChat =
                        (incSender === localMe && incReceiver === localTarget) ||
                        (incSender === localTarget && incReceiver === localMe);

                    if (isForThisChat) {
                        console.log("✅ MATCH PARFAIT ! Injection sur l'écran.");
                        setMessages((prev) => {
                            if (prev.find((m) => m.id === rawMessage.id)) return prev;

                            return [...prev, {
                                id: rawMessage.id,
                                content: rawMessage.content,
                                createdAt: rawMessage.createdAt || rawMessage.created_at,
                                senderId: rawMessage.senderId || rawMessage.senderid,
                                receiverId: rawMessage.receiverId || rawMessage.receiverid
                            }];
                        });
                    } else {
                        console.log("❌ REJETÉ : Ce message appartient à un autre chat.");
                    }
                }
            )
            .subscribe();

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
