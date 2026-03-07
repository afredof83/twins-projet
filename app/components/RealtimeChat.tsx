'use client';

import { useState, useEffect, useOptimistic, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
// Server actions supprimées — on utilise fetch vers /api/chat
import { deriveSharedKey, encryptLocal, decryptLocal } from '@/lib/crypto-client';
import { Send, AlertCircle, Loader2 } from 'lucide-react';
import { getApiUrl } from '@/lib/api-config';
import { SecureMessageBubble } from '@/app/components/SecureMessageBubble';
import { TacticalEarpiece } from '@/app/components/TacticalEarpiece';

type Message = { id: string; content: string; senderId: string; receiverId?: string; createdAt: Date | string };

export default function RealtimeChat({ initialMessages, currentUserId, receiverId, receiverPublicKeyJwk }: any) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [isError, setIsError] = useState(false);
    const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
    const [isDecrypting, setIsDecrypting] = useState(true);

    // --- ÉTATS DE PAGINATION ---
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const [hasMore, setHasMore] = useState(initialMessages.length >= 50);

    const formRef = useRef<HTMLFormElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const topObserverRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const decryptedContextRef = useRef<{ id: string, clearText: string, isMe: boolean, createdAt: number }[]>([]);

    const handleDecrypted = (id: string, clearText: string, isMe: boolean) => {
        const current = decryptedContextRef.current;
        // Éviter les doublons
        if (current.some(m => m.id === id)) return;

        // On ajoute, puis on trie chronologiquement (createdAt)
        const newMsg = { id, clearText, isMe, createdAt: Date.now() };
        const updated = [...current, newMsg].sort((a, b) => a.createdAt - b.createdAt);

        // On ne conserve que les 20 derniers max pour la perf
        decryptedContextRef.current = updated.slice(-20);
    };

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [optimisticMessages, addOptimisticMessage] = useOptimistic(
        messages,
        (state, newMsg: Message) => [...state, newMsg]
    );

    // =====================================================
    // 🔑 DÉRIVATION ECDH AU MONTAGE
    // Clé privée auto-récupérée depuis Secure Storage + clé publique du destinataire
    // =====================================================
    useEffect(() => {
        async function initCrypto() {
            try {
                if (!receiverPublicKeyJwk) {
                    console.warn("[E2E] Clé publique du destinataire manquante, chiffrement désactivé.");
                    setIsDecrypting(false);
                    return;
                }

                // Dérivation de la clé partagée (récupère auto la clé privée du coffre-fort)
                const derived = await deriveSharedKey(JSON.parse(receiverPublicKeyJwk));
                setSharedKey(derived);

                // On ne déchiffre pas les messages lors du chargement : SecureMessageBubble s'en chargera
                setMessages(initialMessages);
            } catch (e) {
                console.error("[E2E] Erreur dérivation ECDH:", e);
            } finally {
                setIsDecrypting(false);
            }
        }
        initCrypto();
    }, [receiverPublicKeyJwk]); // eslint-disable-line react-hooks/exhaustive-deps

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
                        const { createClient } = await import('@/lib/supabaseBrowser');
                        const supabaseClient = createClient();
                        const { data: { session } } = await supabaseClient.auth.getSession();
                        const headers: any = { 'Content-Type': 'application/json' };
                        if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

                        const res = await fetch(getApiUrl(`/api/chat?receiverId=${receiverId}&cursorId=${oldestMessage.id}`), { headers });
                        const data = await res.json();
                        const older = data.messages || [];

                        if (older.length < 50) setHasMore(false);

                        // Ne pas déchiffrer ici, laisser SecureMessageBubble s'en occuper
                        setMessages((prev) => [...older, ...prev]);

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
    }, [hasMore, isLoadingOlder, messages, receiverId, sharedKey]);

    // Écoute des WebSockets Supabase
    useEffect(() => {
        const channel = supabase
            .channel(`chat_${receiverId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'Message',
                filter: `receiverId=eq.${currentUserId}`
            }, async (payload) => {
                const incoming = payload.new as Message;
                // Le déchiffrement est délégué au composant graphique
                setMessages((prev) => [...prev, incoming]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUserId, receiverId, supabase, sharedKey]);

    // Auto-scroll intelligent
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

        formRef.current?.reset();
        setIsError(false);

        // Affichage Optimiste 0ms (Le client voit le texte en clair)
        addOptimisticMessage({
            id: `temp-${Date.now()}`,
            content,
            senderId: currentUserId,
            receiverId,
            createdAt: new Date(),
        });

        // CHIFFREMENT CÔTÉ CLIENT puis envoi au serveur aveugle
        try {
            let payload = content;
            if (sharedKey) {
                payload = await encryptLocal(content, sharedKey);
            }

            const { createClient } = await import('@/lib/supabaseBrowser');
            const supabaseClient = createClient();
            const { data: { session } } = await supabaseClient.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const res = await fetch(getApiUrl('/api/chat'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ content: payload, receiverId })
            });
            const result = await res.json();
            if (!result?.success) throw new Error(result?.error || "Refus du serveur");

        } catch (error) {
            console.error("Échec de transmission:", error);
            setIsError(true);
            if (formRef.current) {
                const input = formRef.current.elements.namedItem('content') as HTMLInputElement;
                if (input) {
                    input.value = content;
                    input.focus();
                }
            }
        }
    };

    // SKELETON DE DÉCHIFFREMENT
    if (isDecrypting) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                    <p className="text-xs text-emerald-400 font-mono uppercase tracking-widest">Déchiffrement en cours...</p>
                </div>
            </div>
        );
    }

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
                                <div key={msg.id} className={`transition-all duration-300 ${msg.id.startsWith('temp-') ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                                    <SecureMessageBubble
                                        id={msg.id}
                                        encryptedPayload={msg.content}
                                        sharedKey={sharedKey}
                                        isSender={isMe}
                                        onDecrypted={handleDecrypted}
                                    />
                                </div>
                            );
                        })
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* OREILLETTE TACTIQUE (Ne s'active qu'avec du texte déchiffré) */}
                <div className="mt-8">
                    <TacticalEarpiece getDecryptedContext={() => decryptedContextRef.current} />
                </div>
            </div>

            {/* FORMULAIRE */}
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
                        placeholder="Message chiffré de bout en bout..."
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
