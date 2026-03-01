'use client';

import { useState, useEffect, useOptimistic, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { sendMessage, getOlderMessages } from '@/app/actions/chat';
import { Send, AlertCircle, Loader2 } from 'lucide-react';

type Message = { id: string; content: string; senderId: string; receiverId?: string; createdAt: Date | string };

export default function RealtimeChat({ initialMessages, currentUserId, receiverId }: any) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [isError, setIsError] = useState(false);

    // --- ÉTATS DE PAGINATION ---
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const [hasMore, setHasMore] = useState(initialMessages.length >= 50);

    const formRef = useRef<HTMLFormElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const topObserverRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [optimisticMessages, addOptimisticMessage] = useOptimistic(
        messages,
        (state, newMsg: Message) => [...state, newMsg]
    );

    // --- L'OBSERVATEUR D'INFINITE SCROLL (Le Radar Front-end) ---
    useEffect(() => {
        const observer = new IntersectionObserver(
            async (entries) => {
                const target = entries[0];
                if (target.isIntersecting && hasMore && !isLoadingOlder) {
                    setIsLoadingOlder(true);

                    const oldestMessage = messages[0];
                    if (!oldestMessage) {
                        setIsLoadingOlder(false);
                        return;
                    }

                    const container = scrollContainerRef.current;
                    const previousScrollHeight = container?.scrollHeight || 0;

                    try {
                        const older = await getOlderMessages(receiverId, oldestMessage.id);

                        if (older.length < 50) setHasMore(false); // Fin des archives

                        // Injection des archives au-dessus
                        setMessages((prev) => [...older, ...prev]);

                        // ANCRAGE DU SCROLL : On compense mathématiquement la taille des nouveaux éléments
                        setTimeout(() => {
                            if (container) {
                                container.scrollTop = container.scrollHeight - previousScrollHeight;
                            }
                        }, 0);
                    } catch (error) {
                        console.error("Erreur de pagination:", error);
                    } finally {
                        setIsLoadingOlder(false);
                    }
                }
            },
            { root: scrollContainerRef.current, threshold: 0.1 }
        );

        if (topObserverRef.current) observer.observe(topObserverRef.current);
        return () => observer.disconnect();
    }, [hasMore, isLoadingOlder, messages, receiverId]);

    // Écoute des WebSockets Supabase
    useEffect(() => {
        const channel = supabase
            .channel(`chat_${receiverId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'Message', // Vérifiez la majuscule/minuscule exacte en BDD
                filter: `receiverId=eq.${currentUserId}` // On n'écoute que ce qui nous est destiné
            }, (payload) => {
                setMessages((prev) => [...prev, payload.new as Message]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUserId, receiverId, supabase]);

    // Auto-scroll intelligent (uniquement pour les nouveaux messages, pas pendant le scroll infini)
    const prevMessagesLen = useRef(optimisticMessages.length);
    useEffect(() => {
        if (optimisticMessages.length > prevMessagesLen.current && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
        prevMessagesLen.current = optimisticMessages.length;
    }, [optimisticMessages]);

    const handleSend = async (formData: FormData) => {
        const content = formData.get('content') as string;
        if (!content.trim()) return;

        // 1. On vide le formulaire et on retire l'erreur précédente
        formRef.current?.reset();
        setIsError(false);

        // 2. Affichage Optimiste 0ms (Le client croit que c'est envoyé)
        addOptimisticMessage({
            id: `temp-${Date.now()}`,
            content,
            senderId: currentUserId,
            receiverId,
            createdAt: new Date(),
        });

        // 3. Le crash-test Server
        try {
            const result = await sendMessage(formData);

            // Si votre Server Action retourne un objet avec success: false
            if (!result?.success) throw new Error("Refus du serveur");

        } catch (error) {
            console.error("Échec de transmission:", error);

            // 4. LE ROLLBACK : Le message optimiste va disparaître, on sauve les meubles.
            setIsError(true);

            if (formRef.current) {
                const input = formRef.current.elements.namedItem('content') as HTMLInputElement;
                if (input) {
                    input.value = content; // On remet le texte dans l'input !
                    input.focus(); // On force le focus pour qu'il puisse retenter
                }
            }
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* ZONE DE SCROLL */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 scrollbar-thin">

                {/* L'AMORCE INVISIBLE : C'est elle qui déclenche l'IntersectionObserver */}
                <div ref={topObserverRef} className="w-full h-1" />

                {/* INDICATEUR DE FOUILLE */}
                {isLoadingOlder && (
                    <div className="flex justify-center items-center py-2 text-blue-500">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-xs uppercase tracking-widest font-bold">Déchiffrement des archives...</span>
                    </div>
                )}

                <div className="space-y-4 pt-2">
                    {optimisticMessages.length === 0 && !hasMore ? (
                        <div className="text-center text-slate-500 font-mono text-xs mt-10">
                            DÉBUT DE LA TRANSMISSION...
                        </div>
                    ) : (
                        optimisticMessages.map((msg) => {
                            const isMe = msg.senderId === currentUserId;
                            const isSystem = msg.senderId === 'CORTEX_SYSTEM';

                            if (isSystem) {
                                return (
                                    <div key={msg.id} className="flex justify-center my-4 animate-in fade-in duration-500">
                                        <div className="px-4 py-2 rounded-full bg-purple-900/30 border border-purple-500/50 text-purple-200 text-xs font-mono tracking-wide text-center max-w-[90%] shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                                            🧠 {msg.content.replace('[CORTEX] ', '')}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-3 rounded-xl max-w-[80%] ${isMe ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-tr-sm' : 'bg-zinc-800/50 border border-zinc-700 text-zinc-300 rounded-tl-sm'}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* FORMULAIRE (Inchangé) */}
            <div className="shrink-0 p-4 border-t border-white/10 bg-black/50 backdrop-blur-md">
                {isError && (
                    <div className="mb-2 flex items-center gap-2 text-red-400 text-xs font-semibold animate-pulse">
                        <AlertCircle className="w-4 h-4" />
                        Échec réseau : Votre message n'a pas pu être envoyé. Veuillez réessayer.
                    </div>
                )}
                <form ref={formRef} action={handleSend} className="flex gap-2">
                    <input type="hidden" name="receiverId" value={receiverId} />
                    <input
                        type="text"
                        name="content"
                        placeholder="Entrez votre message tactique..."
                        autoComplete="off"
                        className={`flex-1 bg-black/40 border ${isError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-blue-500/50'} rounded-xl px-4 py-4 text-sm text-white outline-none transition-colors`}
                    />
                    <button
                        type="submit"
                        className={`px-6 py-4 border rounded-xl flex items-center justify-center transition-all active:scale-95 ${isError ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30'}`}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
