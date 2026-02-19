'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DirectMessage } from '@prisma/client' // Optional type safety if needed

export default function SecureChat({ myId, partnerId, onClose }: { myId: string, partnerId: string, onClose: () => void }) {
    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState('')
    const scrollRef = useRef<HTMLDivElement>(null)

    const supabase = createClient()

    // 1. Charger l'historique et écouter les nouveaux messages
    useEffect(() => {
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('DirectMessage')
                .select('*')
                .or(`and(sender_id.eq.${myId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${myId})`)
                .order('created_at', { ascending: true });
            if (data) setMessages(data);
        };

        fetchMessages();

        const channel = supabase.channel(`chat_${partnerId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'DirectMessage'
            }, (payload: any) => {
                setMessages(prev => [...prev, payload.new])
            }).subscribe();

        return () => { supabase.removeChannel(channel) };
    }, [myId, partnerId]);

    // 2. Auto-scroll vers le bas
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 3. Envoyer un message
    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const content = newMessage;
        setNewMessage('');

        await supabase.from('DirectMessage').insert([{
            sender_id: myId,
            receiver_id: partnerId,
            content: content
        }]);
    };

    return (
        <div className="flex flex-col h-full bg-[#0b141a] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#202c33] border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white">
                        {partnerId.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-slate-200">Liaison : {partnerId.slice(0, 8)}</span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0a0f] custom-scrollbar">
                {messages.map((m) => {
                    const isMe = m.sender_id === myId;
                    return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm shadow-md break-words ${isMe ? 'bg-[#005c4b] text-white rounded-tr-none' : 'bg-[#202c33] text-slate-200 rounded-tl-none'
                                }`}>
                                {m.content}
                                <p className="text-[9px] text-slate-400 text-right mt-1 opacity-50 select-none">
                                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-[#202c33] flex gap-2 border-t border-slate-700">
                <input
                    value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    placeholder="Message crypté..."
                    className="flex-1 bg-[#2a3942] p-2 rounded-lg outline-none text-white text-sm border border-transparent focus:border-blue-500/50 transition-colors placeholder:text-slate-500"
                />
                <button className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg px-4 transition-colors font-bold text-xs uppercase tracking-wider shadow-lg">
                    SEND
                </button>
            </form>
        </div>
    )
}
