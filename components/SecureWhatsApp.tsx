import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Send, X, Shield, Cpu, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function SecureWhatsApp({ profileId, partnerId, channelId, onClose }: any) {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);
    const [showNewMessageNotif, setShowNewMessageNotif] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Pour la gestion du typing
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    // On garde une ref vers le channel pour éviter de re-souscrire sans cesse
    const channelRef = useRef<any>(null);

    useEffect(() => {
        setMounted(true);
        if (!channelId) return;

        fetchMessages();

        // 📡 CONFIGURATION DU CANAL REALTIME (Messages + Typing)
        // On détruit l'ancien channel s'il existe pour nettoyage
        if (channelRef.current) supabase.removeChannel(channelRef.current);

        const channel = supabase.channel(`chat:${channelId}`, {
            config: { broadcast: { self: false } }
        });
        channelRef.current = channel;

        channel
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `communication_id=eq.${channelId}` },
                (payload) => {
                    setMessages((prev) => {
                        // Anti-doublon (si optimistic UI l'a déjà ajouté ou double event)
                        if (prev.find(m => m.id === payload.new.id)) return prev;

                        // Notification visuelle si le message vient de l'autre
                        if (payload.new.sender_id !== profileId) {
                            setShowNewMessageNotif(true);
                        }
                        return [...prev, payload.new];
                    });
                })
            .on('broadcast', { event: 'typing' }, (payload: any) => {
                // On vérifie que ce n'est pas nous-mêmes (filtré par self:false normalement, mais sécu)
                if (payload.payload?.senderId !== profileId) {
                    setIsPartnerTyping(payload.payload?.isTyping || false);
                }
            })
            .subscribe();

        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, [channelId]);

    // Cleanup du timeout typing
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    }, []);

    // Scroll auto à chaque nouveau message ou changement de typing
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        if (showNewMessageNotif) {
            const timer = setTimeout(() => setShowNewMessageNotif(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [messages, isPartnerTyping, showNewMessageNotif]);

    const fetchMessages = async () => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('communication_id', channelId)
            .order('created_at', { ascending: true });
        if (data) setMessages(data);
    };

    // ✍️ FONCTION : Signaler que je suis en train d'écrire
    const handleTyping = () => {
        if (!channelRef.current) return;

        // On envoie un signal 'typing' = true
        channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { isTyping: true, senderId: profileId }
        });

        // On reset le timeout pour envoyer 'typing' = false dans 2s si pas de nouvelle frappe
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: { isTyping: false, senderId: profileId }
                });
            }
            setIsPartnerTyping(false); // Juste pour être sûr localement
        }, 2000);
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const content = newMessage.trim();
        if (!content || !channelId) return;

        // 🚀 OPTIMISTIC UI : Affichage immédiat avant même la réponse serveur
        const optimisticMsg = {
            id: 'temp-' + Date.now(),
            content,
            sender_id: profileId,
            communication_id: channelId,
            created_at: new Date().toISOString(),
            status: 'sending'
        };

        setMessages((prev) => [...prev, optimisticMsg]);
        setNewMessage('');

        // On arrête explicitement le typing quand on envoie
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { isTyping: false, senderId: profileId }
            });
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        const { error } = await supabase
            .from('messages')
            .insert([{ content, sender_id: profileId, communication_id: channelId }])
            .select();

        if (error) {
            // Rollback si erreur
            setMessages((prev) => prev.filter(m => m.id !== optimisticMsg.id));
            alert("Erreur d'envoi");
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">

            {/* NOTIFICATION VISUELLE FLOTTANTE */}
            {showNewMessageNotif && (
                <div className="absolute top-10 bg-cyan-500 text-black px-4 py-2 rounded-full font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.5)] animate-bounce flex items-center gap-2 z-50">
                    <MessageSquare size={14} /> NOUVEAU MESSAGE REÇU
                </div>
            )}

            <div className="w-full h-full sm:max-w-md sm:h-[600px] sm:rounded-2xl bg-[#0d0d0d] border-t sm:border border-cyan-500/30 shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10">
                {/* HEADER */}
                <div className="p-3 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
                    <div className="flex items-center gap-2 text-white text-sm font-medium">
                        <Shield size={16} className="text-cyan-400" /> Flux Quantique
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                {/* ZONE DE MESSAGES */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                    {messages.map((msg) => {
                        const isMe = msg.sender_id === profileId;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1 fade-in duration-300`}>
                                <div className={`
                                    max-w-[85%] p-3 rounded-xl text-sm shadow-md break-words
                                    ${isMe
                                        ? 'bg-cyan-600/20 border border-cyan-500/30 text-white rounded-tr-none'
                                        : 'bg-zinc-800 border border-white/5 text-gray-200 rounded-tl-none'}
                                `}>
                                    {msg.content}
                                </div>
                            </div>
                        );
                    })}

                    {/* 💬 LES TROIS PETITS POINTS (Typing Indicator) */}
                    {isPartnerTyping && (
                        <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-zinc-800 border border-white/5 p-3 rounded-xl rounded-tl-none flex gap-1 items-center">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.32s]"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.16s]"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* INPUT BAR */}
                <form onSubmit={handleSend} className="p-4 bg-zinc-900/80 border-t border-white/10 backdrop-blur-md">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value);
                                handleTyping(); // Déclenche le signal "écrit..."
                            }}
                            placeholder="Entrez vos données..."
                            className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-3 text-base text-white focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-600"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="bg-cyan-600 p-3 rounded-lg text-white hover:bg-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(8,145,178,0.3)]"
                        >
                            <Send size={24} />
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
