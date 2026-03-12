'use client';

import { useState, useEffect, useOptimistic, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
// Server actions supprimées — on utilise fetch vers /api/chat
import { deriveSharedKey, encryptLocal, decryptLocal, getStoredPrivateKeyJwk } from '@/lib/crypto-client';
import { Send, AlertCircle, Loader2 } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { SecureMessageBubble } from '@/app/components/SecureMessageBubble';
import { TacticalEarpiece } from '@/app/components/TacticalEarpiece';
import { usePrismManager } from '@/components/providers/PrismProvider';

type Message = { id: string; content: string; senderId: string; receiverId?: string; createdAt: Date | string };

export default function RealtimeChat({ initialMessages, receiverId, receiverPublicKeyJwk }: any) {
    const { activeProfile } = usePrismManager();
    const currentUserId = activeProfile?.id;
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [isError, setIsError] = useState(false);
    const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
    const sharedKeyRef = useRef<CryptoKey | null>(null);
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
                // 1. La requête stricte vers Supabase pour le profil du partenaire
                const { data: partnerProfile, error: profileError } = await supabase
                    .from('Profile')
                    .select('id, publicKey')
                    .eq('id', receiverId)
                    .single();

                // 2. Le Stress-Test de la donnée (L'entonnoir de sécurité)
                if (profileError || !partnerProfile) {
                    console.error("❌ Impossible de trouver le profil de l'interlocuteur :", profileError);
                    setIsDecrypting(false);
                    return;
                }

                if (!partnerProfile.publicKey) {
                    console.error("❌ Le profil du partenaire a été trouvé, mais sa publicKey est VIDE (null) !");
                    setIsDecrypting(false);
                    return;
                }

                console.log("✅ Clé publique du partenaire récupérée avec succès :", partnerProfile.publicKey.substring(0, 20) + "...");

                // 3. Récupération de MA clé privée et dérivation
                const myPrivateKeyJwk = await getStoredPrivateKeyJwk();
                const myPrivateKey = await window.crypto.subtle.importKey(
                    "jwk", 
                    myPrivateKeyJwk, 
                    { name: "ECDH", namedCurve: "P-256" }, 
                    true, 
                    ["deriveKey"]
                );

                const derived = await deriveSharedKey(myPrivateKey, partnerProfile.publicKey);
                setSharedKey(derived);
                sharedKeyRef.current = derived;

                // --- L'ÉTAPE CRITIQUE : DÉCHIFFREMENT DE L'HISTORIQUE INITIAL ---
                const decryptedMessages = await Promise.all(
                    initialMessages.map(async (msg: Message) => {
                        if (msg.content && (msg.content.includes(':') || msg.content.startsWith('🧠'))) {
                            try {
                                const clearText = await decryptLocal(msg.content, derived);
                                return { ...msg, content: clearText };
                            } catch (e) {
                                console.error("Échec du déchiffrement du message historique:", msg.id, e);
                                return { ...msg, content: "🔒 [Message indéchiffrable]" };
                            }
                        }
                        return msg;
                    })
                );
                setMessages(decryptedMessages);
            } catch (e) {
                console.error("[E2E] Erreur dérivation ECDH:", e);
            } finally {
                setIsDecrypting(false);
            }
        }
        initCrypto();
    }, [receiverId, initialMessages]); // eslint-disable-line react-hooks/exhaustive-deps

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

                        const res = await fetch(getApiUrl(`/api/chat?receiverId=${receiverId}&cursorId=${oldestMessage.id}&senderId=${currentUserId}`), { headers });
                        const data = await res.json();
                        const older = data.messages || [];

                        if (older.length < 50) setHasMore(false);

                        // --- DÉCHIFFREMENT DES ARCHIVES ---
                        if (sharedKeyRef.current) {
                            const decryptedOlder = await Promise.all(
                                older.map(async (msg: Message) => {
                                    if (msg.content && (msg.content.includes(':') || msg.content.startsWith('🧠'))) {
                                        try {
                                            const clearText = await decryptLocal(msg.content, sharedKeyRef.current!);
                                            return { ...msg, content: clearText };
                                        } catch (e) {
                                            return { ...msg, content: "🔒 [Message indéchiffrable]" };
                                        }
                                    }
                                    return msg;
                                })
                            );
                            setMessages((prev) => [...decryptedOlder, ...prev]);
                        } else {
                            setMessages((prev) => [...older, ...prev]);
                        }

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

    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const channelRef = useRef<any>(null);

    // Écoute des WebSockets Supabase
    useEffect(() => {
        // ID de canal déterministe (toujours le même pour les deux utilisateurs)
        const channelId = [currentUserId, receiverId].sort().join('_');

        // Nettoyage si le destinataire change
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

        const channel = supabase
            .channel(`chat_${channelId}`, {
                config: { broadcast: { self: true } } // On veut recevoir nos propres broadcasts pour confirmation si besoin
            })
            // Écoute des nouveaux messages (Tous les messages du canal, le RLS filtre l'accès)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'Message'
            }, async (payload) => {
                const incoming = payload.new as Message;

                // Si c'est un message du canal actuel
                if ((incoming.senderId === currentUserId && incoming.receiverId === receiverId) ||
                    (incoming.senderId === receiverId && incoming.receiverId === currentUserId)) {

                    // --- DÉCHIFFREMENT IMMÉDIAT DU MESSAGE ENTRANT ---
                    if (incoming.content && (incoming.content.includes(':') || incoming.content.startsWith('🧠'))) {
                        try {
                            if (sharedKeyRef.current) {
                                incoming.content = await decryptLocal(incoming.content, sharedKeyRef.current);
                            } else {
                                incoming.content = "🔒 [Clé manquante]";
                            }
                        } catch (e) {
                            incoming.content = "🔒 [Message indéchiffrable]";
                        }
                    }

                    setMessages((prev) => {
                        // Éviter les doublons (si le message est déjà là via fetch ou optimisme)
                        if (prev.some(m => m.id === incoming.id)) return prev;
                        return [...prev, incoming];
                    });

                    // Si on est le destinataire, on marque comme lu
                    if (incoming.receiverId === currentUserId) {
                        fetch(getApiUrl('/api/chat'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'read', receiverId, senderId: currentUserId })
                        });
                    }
                }
            })
            // 🎙️ ÉCOUTE DU BROADCAST "TYPING"
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
                // On ignore nos propres événements de frappe (handled localement si besoin, mais ici on veut l'autre)
                if (payload.userId !== currentUserId) {
                    setIsTyping(payload.isTyping);
                    if (payload.isTyping) {
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
                    }
                }
            })
            .subscribe((status) => {
                console.log(`📡 [Chat-Realtime] Channel status: ${status}`);
            });

        channelRef.current = channel;

        // Mark as read on mount
        fetch(getApiUrl('/api/chat'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'read', receiverId, senderId: currentUserId })
        });

        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, [currentUserId, receiverId, supabase]);

    const broadcastTyping = (typing: boolean) => {
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { isTyping: typing, userId: currentUserId },
            });
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        broadcastTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            broadcastTyping(false);
        }, 2000);
    };

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
        if (!content || !content.trim() || !currentUserId) return;

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

        // CHIFFREMENT STRICT CÔTÉ CLIENT
        try {
            if (!sharedKey) {
                throw new Error("Erreur de sécurité : Le canal chiffré ne peut pas être établi. Clé partagée non dérivée.");
            }

            const payload = await encryptLocal(content, sharedKey);

            const { createClient } = await import('@/lib/supabaseBrowser');
            const supabaseClient = createClient();
            const { data: { session } } = await supabaseClient.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const res = await fetch(getApiUrl('/api/chat'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ content: payload, receiverId, senderId: currentUserId })
            });
            const result = await res.json();
            if (!result?.success) throw new Error(result?.error || "Refus du serveur");

        } catch (error: any) {
            console.error("🔒 [E2E-SECURITY] Échec critique:", error.message);
            setIsError(true);
            
            // On remet le contenu pour que l'utilisateur ne perde pas son message
            if (formRef.current) {
                const input = formRef.current.elements.namedItem('content') as HTMLInputElement;
                if (input) {
                    input.value = content;
                    input.focus();
                }
            }

            // Message spécifique si c'est une erreur de clé
            if (error.message.includes("Erreur de sécurité")) {
                alert(error.message); // On utilise une alerte système ou on pourrait passer par un toast contextuel
            }
        }
    };

    // SKELETON DE DÉCHIFFREMENT
    if (isDecrypting) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
                    <p className="text-xs text-[var(--text-main)]/60 font-mono uppercase tracking-widest">Déchiffrement en cours...</p>
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
                    <div className="flex justify-center items-center py-2 text-[var(--primary)]">
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
                                        <div className="px-4 py-2 rounded-full bg-[var(--cortex)]/20 border border-[var(--cortex)]/40 text-[var(--text-main)] text-xs font-mono tracking-wide text-center max-w-[90%] shadow-[0_0_15px_rgba(99,102,241,0.2)]">
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
                {isTyping && (
                    <div className="mb-2 text-[10px] text-[var(--accent)] font-mono animate-pulse uppercase tracking-widest">
                        📡 L'agent adverse est en train d'écrire...
                    </div>
                )}
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
                        onChange={handleInput}
                        placeholder="Message chiffré de bout en bout..."
                        autoComplete="off"
                        className={`flex-1 bg-black/40 border ${isError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-blue-500/50'} rounded-xl px-4 py-4 text-sm text-white outline-none transition-colors`}
                    />
                    <button
                        type="submit"
                        className={`px-6 py-4 border rounded-xl flex items-center justify-center transition-all active:scale-95 ${isError ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30' : 'bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/30 hover:bg-[var(--primary)]/30'}`}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
