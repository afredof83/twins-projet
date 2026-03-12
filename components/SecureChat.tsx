'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Lock, Send, ShieldCheck } from 'lucide-react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { getApiUrl } from '@/lib/api';
// Server actions supprimées — on utilise fetch vers /api/translation et /api/guardian

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
    const [partnerCountry, setPartnerCountry] = useState<string | null>(null)
    const [isTranslating, setIsTranslating] = useState(false)
    const [isVaultLocked, setIsVaultLocked] = useState(false)
    const [unlockPassword, setUnlockPassword] = useState("")
    const [unlockError, setUnlockError] = useState("")
    const [retryTrigger, setRetryTrigger] = useState(0)

    const scrollRef = useRef<HTMLDivElement>(null)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const channelRef = useRef<any>(null)
    const lastTypingTime = useRef(0)
    const sharedKeyRef = useRef<CryptoKey | null>(null)

    useEffect(() => {
        if (!channelId) return;

        let isMounted = true;
        let room: any = null;
        const roomName = `room_v4_${channelId}`;

        // LE DÉBRUITAGE : On attend 300ms pour ignorer le double-render de React
        const initDelay = setTimeout(async () => {
            if (!isMounted) return;

            try {
                // 1. Fetch partner's profile with Strict Guardrails
                const { data: partnerData, error: profileError } = await supabase
                    .from('Profile')
                    .select('id, country, publicKey')
                    .eq('id', partnerId)
                    .single();

                if (partnerData?.country && isMounted) setPartnerCountry(partnerData.country);

                // 2. Le Stress-Test de la donnée (L'entonnoir de sécurité)
                if (profileError || !partnerData) {
                    console.error("❌ Impossible de trouver le profil de l'interlocuteur :", profileError);
                    if (isMounted) setIsLoading(false);
                    throw new Error("Profil partenaire introuvable.");
                }

                if (!partnerData.publicKey) {
                    console.error("❌ Le profil du partenaire a été trouvé, mais sa publicKey est VIDE (null) !");
                    if (isMounted) setIsLoading(false);
                    throw new Error("Le partenaire n'a pas encore de clé E2EE (Profil non initialisé).");
                }

                console.log("✅ Clé publique du partenaire récupérée avec succès :", partnerData.publicKey.substring(0, 20) + "...");

                let sKey: CryptoKey | null = null;
                if (partnerData?.publicKey) {
                    const { deriveSharedKey, getStoredPrivateKeyJwk } = await import('@/lib/crypto-client');
                    try {
                        const myPrivateKeyJwk = await getStoredPrivateKeyJwk();
                        const myPrivateKey = await window.crypto.subtle.importKey(
                            "jwk", myPrivateKeyJwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]
                        );
                        sKey = await deriveSharedKey(myPrivateKey, partnerData.publicKey);
                        sharedKeyRef.current = sKey;
                        if (isMounted) setIsVaultLocked(false);
                    } catch (e: any) {
                         console.error("Erreur dérivation clé partagée:", e);
                         if (e.message && (e.message.includes("RAM") || e.message.includes("Seed Phrase") || e.message.includes("Reconnexion"))) {
                             if (isMounted) {
                                 setIsVaultLocked(true);
                                 setIsLoading(false);
                             }
                             return; // On arrête l'initialisation si verrouillé
                         }
                    }
                }

                // 2. Fetch messages
                const { data: rawMessages } = await supabase.from('Message')
                    .select('*')
                    .eq('communication_id', channelId)
                    .order('created_at', { ascending: true });

                if (isMounted && rawMessages) {
                    if (sKey) {
                        const { decryptLocal } = await import('@/lib/crypto-client');
                        const decryptedMessages = await Promise.all(
                            rawMessages.map(async (msg: any) => {
                                if (msg.content && (msg.content.includes(':') || msg.content.startsWith('🧠'))) {
                                    try {
                                        const clair = await decryptLocal(msg.content, sKey!);
                                        return { ...msg, content: clair };
                                    } catch (err) {
                                        console.error("Impossible de déchiffrer le message", msg.id, err);
                                        return { ...msg, content: "🔒 [Message indéchiffrable]" };
                                    }
                                }
                                return msg;
                            })
                        );
                        setMessages(decryptedMessages);
                    } else {
                        setMessages(rawMessages.map((m: any) => ({ ...m, content: "🔒 [Clé partenaire introuvable]" })));
                    }
                    setIsLoading(false);
                }

                if (!isMounted) return;

                console.log(`📡 Ouverture confirmée du tunnel... [${roomName}]`);

                room = supabase.channel(roomName, {
                    config: { broadcast: { ack: false } }
                });

                room.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Message' }, async (payload: any) => {
                    const incomingMessage = payload.new;
                    if (incomingMessage.communication_id === channelId) {
                        try {
                            // 1. On vérifie si le message contient un ':' (signe qu'il est chiffré)
                            if (incomingMessage.content && (incomingMessage.content.includes(':') || incomingMessage.content.startsWith('🧠'))) {
                                // 2. On attend le déchiffrement avec la sharedKey
                                if (sharedKeyRef.current) {
                                    const { decryptLocal } = await import('@/lib/crypto-client');
                                    const decryptedText = await decryptLocal(incomingMessage.content, sharedKeyRef.current);
                                    // 3. On remplace le texte chiffré par le texte en clair
                                    incomingMessage.content = decryptedText;
                                } else {
                                    incomingMessage.content = "🔒 [Clé manquante]";
                                }
                            }
                        } catch (error) {
                            console.error("❌ Échec du déchiffrement à la volée :", error);
                            incomingMessage.content = "🔒 [Message indéchiffrable]";
                        }

                        if (isMounted) {
                            // 4. ON MET À JOUR L'UI SEULEMENT APRÈS LE DÉCHIFFREMENT
                            setMessages((prevMessages) => {
                                // Optionnel : éviter les doublons avec l'affichage optimiste de l'expéditeur
                                if (prevMessages.some(msg => msg.id === incomingMessage.id)) return prevMessages;
                                return [...prevMessages, incomingMessage];
                            });
                            setIsTyping(false);
                        }
                    }
                })
                .on('broadcast', { event: 'typing' }, (payload: any) => {
                    if (payload.payload.sender_id !== myId) {
                        if (isMounted) setIsTyping(true);
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => {
                            if (isMounted) setIsTyping(false);
                        }, 2000);
                    }
                })
                .subscribe((status: string) => {
                    console.log(`📡 STATUT [${roomName}]:`, status);
                    if (isMounted) setIsConnected(status === 'SUBSCRIBED');
                });

                channelRef.current = room;

            } catch (err) {
                console.error("Erreur initialisation chat:", err);
                if (isMounted) setIsLoading(false);
            }
        }, 300);

        // LE NETTOYAGE SÉCURISÉ
        return () => {
            isMounted = false;
            clearTimeout(initDelay);
            if (room) {
                console.log(`🛑 Fermeture de ${roomName}`);
                setIsConnected(false);
                supabase.removeChannel(room);
            }
        };
    }, [channelId, myId, partnerId, retryTrigger]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleUnlockVault = async (e: React.FormEvent) => {
        e.preventDefault();
        setUnlockError("");
        try {
            const { unlockLocalVault, wrapKeyWithSession } = await import('@/lib/crypto-client');
            const privateKey = await unlockLocalVault(unlockPassword);
            
            // Nouveau: On wrap la clé pour qu'elle survive aux prochains F5
            try {
                const { createClient: createSupabase } = await import('@/lib/supabaseBrowser');
                const supabaseClient = createSupabase();
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session?.access_token) {
                    await wrapKeyWithSession(privateKey, session.access_token);
                }
            } catch (wrapErr) {
                console.error("Erreur gérable lors du wrapping de la clé de session", wrapErr);
            }

            setIsVaultLocked(false);
            setUnlockPassword("");
            setIsLoading(true);
            setRetryTrigger(prev => prev + 1);
        } catch (err) {
            setUnlockError("Mot de passe incorrect. Impossible de déchiffrer le coffre.");
        }
    };

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        const now = Date.now();
        // N'envoie le signal que si connecté et pas plus d'1 fois toutes les 2 secondes
        if (isConnected && now - lastTypingTime.current > 2000) {
            lastTypingTime.current = now;
            channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { sender_id: myId } }).catch(() => { });
        }
    };

    // 🟢 CORRECTIF D'AFFICHAGE OPTIMISTE : On ajoute la date exacte pour éviter un crash
    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !channelId || isTranslating) return;

        const originalContent = newMessage.trim();
        setNewMessage('');
        setIsTranslating(true); // 🟢 On bloque le bouton pendant la traduction

        let finalContent = originalContent;

        // 🌍 SI LE PARTENAIRE A UN PAYS DÉFINI, ON LANCE LA TRADUCTION
        if (partnerCountry && partnerCountry.toLowerCase() !== 'france') {
            try {
                const { createClient: createSupabase } = await import('@/lib/supabaseBrowser');
                const supabaseClient = createSupabase();
                const { data: { session } } = await supabaseClient.auth.getSession();
                const headers: any = { 'Content-Type': 'application/json' };
                if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

                const data = await fetch(getApiUrl('/api/translation'), {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ text: originalContent, targetCountry: partnerCountry })
                }).then(r => r.json());

                if (data.success && data.translation) {
                    // On combine le message original et sa traduction
                    finalContent = `${originalContent}\n\n[🔄 ${partnerCountry.toUpperCase()} : ${data.translation}]`;
                }
            } catch (err) {
                console.error("Erreur de traduction :", err);
            }
        }

        const newMsgPayload = {
            id: crypto.randomUUID(),
            communication_id: channelId,
            sender_id: myId,
            content: finalContent,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMsgPayload]); // Affichage Optimiste
        
        // 🔒 Chiffrement du message avant sauvegarde
        let contentToSend = finalContent;
        if (sharedKeyRef.current) {
            try {
                const { encryptLocal } = await import('@/lib/crypto-client');
                contentToSend = await encryptLocal(finalContent, sharedKeyRef.current);
            } catch (e) {
                console.error("Encryption failed before sending:", e);
                // Si l'encryption échoue on pourrait throw, mais ici on fallback sur le message en clair si c'est autorisé, ou on bloque
                // Normalement il faut bloquer! 
                return; // 🚨 Sécurité : On ne logue pas en clair si ça rate
            }
        }
        
        const encryptedPayload = { ...newMsgPayload, content: contentToSend };
        await supabase.from('Message').insert([encryptedPayload]);

        setIsTranslating(false); // 🟢 On libère le bouton

        // 🟢 NOUVEAU : LE MICRO ESPION DU GARDIEN
        // On envoie silencieusement le contenu du message à l'IA pour analyse
        console.log("🦇 Interception : Envoi du message au Gardien...");
        (async () => {
            const { createClient: createSupabase } = await import('@/lib/supabaseBrowser');
            const supabaseClient = createSupabase();
            const { data: { session } } = await supabaseClient.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            fetch(getApiUrl('/api/guardian'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ profileId: myId, text: `A dit : "${originalContent}"` })
            }).catch(() => { });
        })();
    };

    if (!channelId) return null;

    if (isVaultLocked) {
        return (
            <div className="flex flex-col h-full bg-[#050505] border border-slate-800 shadow-2xl overflow-hidden rounded-xl items-center justify-center p-6 text-center animate-in fade-in zoom-in-95">
                <h2 className="text-xl font-bold text-emerald-400 mb-2 font-mono">🔒 COFFRE-FORT VERROUILLÉ</h2>
                <p className="text-slate-400 mb-6 text-sm font-mono max-w-sm">Votre session a été rafraîchie. Saisissez votre mot de passe pour déchiffrer vos messages E2EE en RAM.</p>
                
                <form onSubmit={handleUnlockVault} className="flex flex-col gap-4 w-full max-w-sm">
                    <input 
                        type="password" 
                        placeholder="Mot de passe du compte" 
                        value={unlockPassword}
                        onChange={(e) => setUnlockPassword(e.target.value)}
                        className="px-4 py-3 bg-black border border-slate-800 rounded-lg text-emerald-400 font-mono text-center focus:outline-none focus:border-emerald-500/50"
                        required
                    />
                    <button type="submit" disabled={!unlockPassword} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono py-3 rounded-lg transition-colors disabled:opacity-50">
                        DÉVERROUILLER
                    </button>
                    {unlockError && <p className="text-red-500 text-sm mt-2 font-mono">{unlockError}</p>}
                </form>
            </div>
        );
    }

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
                            <span>Liaison Chiffrée</span>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center text-slate-500 font-mono text-xs animate-pulse">DÉCRYPTAGE DE L'HISTORIQUE...</div>
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
                <button type="submit" disabled={!newMessage.trim() || isTranslating} className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center min-w-[3rem] px-4 font-mono text-xs font-semibold">
                    {isTranslating ? (
                        <span className="flex items-center gap-2 animate-pulse">
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            TRAD.
                        </span>
                    ) : (
                        <Send size={18} />
                    )}
                </button>
            </form>
        </div>
    );
}
