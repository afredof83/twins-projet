'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Lock, Send, ShieldCheck } from 'lucide-react'
import { RealtimeChannel } from '@supabase/supabase-js'

interface SecureChatProps {
    myId: string;
    partnerId: string;
    channelId?: string;
    onClose: () => void;
}

// ðŸŸ¢ GARANTIE SINGLETON : On initialise une seule fois
const supabase = createClient();

export default function SecureChat({ myId, partnerId, channelId, onClose }: SecureChatProps) {
    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isTyping, setIsTyping] = useState(false)
    const [isConnected, setIsConnected] = useState(false)

    const scrollRef = useRef<HTMLDivElement>(null)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const channelRef = useRef<any>(null)
    const lastTypingTime = useRef(0)

    useEffect(() => {
        if (!channelId) return;

        let isMounted = true;
        let room: any = null;
        const roomName = `room_v4_${channelId}`;

        // LE DÃ‰BRUITAGE : On attend 300ms pour ignorer le double-render de React
        const initDelay = setTimeout(() => {
            if (!isMounted) return;

            console.log(`ðŸ“¡ Ouverture confirmÃ©e du tunnel... [${roomName}]`);

            room = supabase.channel(roomName, {
                config: { broadcast: { ack: false } }
            });

            room.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Message' }, (payload: any) => {
                if (payload.new.communication_id === channelId) {
                    setMessages(prev => {
                        if (prev.some(m => m.id === payload.new.id)) return prev;
                        return [...prev, payload.new];
                    });
                    setIsTyping(false);
                }
            })
                .on('broadcast', { event: 'typing' }, (payload: any) => {
                    if (payload.payload.sender_id !== myId) {
                        setIsTyping(true);
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
                    }
                })
                .subscribe((status: string) => {
                    console.log(`ðŸ“¡ STATUT [${roomName}]:`, status);
                    setIsConnected(status === 'SUBSCRIBED');
                });

            channelRef.current = room;
        }, 300);

        // ðŸŸ¢ LE CORRECTIF EST LÃ€ : On charge l'historique ET ON COUPE LE CHARGEMENT
        supabase.from('Message').select('*').eq('communication_id', channelId).order('created_at', { ascending: true })
            .then(({ data, error }: any) => {
                if (isMounted) {
                    if (data) setMessages(data);
                    setIsLoading(false); // ðŸš¨ LA LIGNE MAGIQUE QUI AFFICHE ENFIN VOS MESSAGES
                }
            });

        // LE NETTOYAGE SÃ‰CURISÃ‰
        return () => {
            isMounted = false;
            clearTimeout(initDelay);
            if (room) {
                console.log(`ðŸ›‘ Fermeture de ${roomName}`);
                setIsConnected(false);
                supabase.removeChannel(room);
            }
        };
    }, [channelId, myId]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        const now = Date.now();
        // N'envoie le signal que si connectÃ© et pas plus d'1 fois toutes les 2 secondes
        if (isConnected && now - lastTypingTime.current > 2000) {
            lastTypingTime.current = now;
            channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { sender_id: myId } }).catch(() => { });
        }
    };

    // ðŸŸ¢ CORRECTIF D'AFFICHAGE OPTIMISTE : On ajoute la date exacte pour Ã©viter un crash
    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !channelId) return;
        const content = newMessage.trim();
        setNewMessage('');

        const newMsgPayload = {
            id: crypto.randomUUID(),
            communication_id: channelId,
            sender_id: myId,
            content: content,
            created_at: new Date().toISOString() // ðŸš¨ AJOUT DE LA DATE
        };

        setMessages(prev => [...prev, newMsgPayload]); // Optimistic UI
        await supabase.from('Message').insert([newMsgPayload]);

        // ðŸŸ¢ NOUVEAU : LE MICRO ESPION DU GARDIEN
        // On envoie silencieusement le contenu du message Ã  l'IA pour analyse
        console.log("ðŸ¦‡ Interception : Envoi du message au Gardien...");
        fetch('/api/guardian', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                profileId: myId, // On met Ã  jour le profil de celui qui vient de parler
                newMemoryContent: `Message interceptÃ© dans le canal de communication : "${content}"`
            })
        }).catch(err => console.error("Erreur du Gardien :", err));
    };

    if (!channelId) return null;

    return (
        <div className="flex flex-col h-full bg-[#050505] border border-slate-800 shadow-2xl overflow-hidden rounded-xl animate-in fade-in zoom-in-95">
            <div className="p-4 bg-[#0f1618] border-b border-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-emerald-500/50 flex items-center justify-center">
                        <Lock size={18} className="text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-mono text-emerald-400 font-semibold uppercase text-sm">Agent: {partnerId.slice(0, 8)}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <ShieldCheck size={12} className="text-emerald-500" />
                            <span>Liaison ChiffrÃ©e</span>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center text-slate-500 font-mono text-xs animate-pulse">DÃ‰CRYPTAGE DE L'HISTORIQUE...</div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === myId;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm transition-all shadow-lg ${isMe ? 'bg-emerald-900/40 border border-emerald-800/30 text-emerald-50 rounded-tr-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'}`}>
                                    <p className="whitespace-pre-wrap font-mono">{msg.content}</p>
                                    <span className="text-[9px] opacity-50 block mt-1 text-right font-mono">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        );
                    })
                )}

                {isTyping && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-lg flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-[#0f1618] border-t border-slate-900 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="Entrez votre transmission..."
                    className="flex-1 bg-black border border-slate-800 rounded-lg px-4 py-3 font-mono text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                <button type="submit" disabled={!newMessage.trim()} className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center w-12"><Send size={18} /></button>
            </form>
        </div>
    );
}
