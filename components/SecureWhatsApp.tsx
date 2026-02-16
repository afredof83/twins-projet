'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, CheckCheck, Loader2, Wifi } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function SecureWhatsApp({ profileId, channelId }: any) {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [status, setStatus] = useState<string>('CONNECTING');
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const activeChannelRef = useRef<any>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const TABLE = 'Message';
    const COL_SENDER = 'fromId';
    const COL_CHANNEL = 'channel_id';

    useEffect(() => {
        if (!channelId || !profileId) return;

        // 1. Historique
        supabase.from(TABLE).select('*').eq(COL_CHANNEL, channelId).order('createdAt', { ascending: true })
            .then(({ data }) => {
                if (data) setMessages(data);
                setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'instant' }), 100);
            });

        // 2. Realtime
        const channel = supabase.channel(`chat_${channelId}`);

        channel
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE }, (payload) => {
                if (payload.new[COL_CHANNEL] === channelId) {
                    const newMsg = { ...(payload.new as any), isNew: true }; // Marqueur de nouveau message
                    setMessages(prev => [...prev.filter(m => m.id !== newMsg.id), newMsg]);
                    setIsPartnerTyping(false);
                    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

                    // Supprimer l'effet visuel "Nouveau" après 5 secondes
                    setTimeout(() => {
                        setMessages(current => current.map(m => m.id === newMsg.id ? { ...m, isNew: false } : m));
                    }, 5000);
                }
            })
            .on('broadcast', { event: 'typing' }, (p) => {
                if (p.payload.userId !== profileId) {
                    setIsPartnerTyping(true);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => setIsPartnerTyping(false), 3000);
                }
            })
            .subscribe((state) => {
                setStatus(state);
                if (state === 'SUBSCRIBED') activeChannelRef.current = channel;
            });

        return () => { channel.unsubscribe(); };
    }, [channelId]);

    const handleInputChange = (e: any) => {
        setNewMessage(e.target.value);
        if (activeChannelRef.current && status === 'SUBSCRIBED') {
            activeChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: profileId } });
        }
    };

    const sendMessage = async (e: any) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        const content = newMessage.trim();
        setNewMessage('');
        await supabase.from(TABLE).insert({ content, [COL_SENDER]: profileId, [COL_CHANNEL]: channelId });
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] border-l border-slate-800 shadow-2xl">
            <div className={`p-2 text-[10px] font-mono border-b border-slate-900 flex items-center gap-2 ${status === 'SUBSCRIBED' ? 'text-cyan-400' : 'text-red-400'}`}>
                <div className={`w-2 h-2 rounded-full ${status === 'SUBSCRIBED' ? 'bg-cyan-500 animate-pulse shadow-[0_0_8px_cyan]' : 'bg-red-500'}`} />
                {status === 'SUBSCRIBED' ? 'LIAISON CRYPTÉE ACTIVE' : 'RECONNEXION...'}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg[COL_SENDER] === profileId ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm transition-all duration-500 shadow-lg ${msg[COL_SENDER] === profileId
                            ? 'bg-cyan-900/40 border border-cyan-800/30 text-cyan-50 rounded-tr-none'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                            } ${msg.isNew ? 'ring-2 ring-cyan-500 animate-pulse shadow-[0_0_20px_rgba(6,182,212,0.5)]' : ''}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {/* INDICATEUR DE FRAPPE : POINTS BLANCS SUR FOND CYAN */}
                {isPartnerTyping && (
                    <div className="flex gap-1.5 ml-2 p-3 bg-cyan-900/20 rounded-2xl rounded-tl-none border border-cyan-800/30 w-fit">
                        <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 bg-white rounded-full animate-bounce" />
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-black border-t border-slate-900 flex gap-2">
                <input
                    type="text" value={newMessage}
                    onChange={handleInputChange}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                    placeholder="Échange sécurisé..."
                />
                <button className="px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-all active:scale-90 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}