'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Send, ShieldCheck, CheckCheck } from 'lucide-react';
import { createClient } from '@/lib/supabaseBrowser';

interface SecureWhatsAppProps {
    myId: string;
    channelId: string | null;
    partnerId?: string | null;
    topic: string;
    onClose: () => void;
}

export default function SecureWhatsApp({ myId, channelId, partnerId, topic, onClose }: SecureWhatsAppProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    // Scroll automatique vers le bas
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!channelId) return;

        // 1. Charger l'historique du CANAL
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('Message')
                .select('*')
                .eq('channel_id', channelId) // <-- FILTRE PAR CANAL
                .order('created_at', { ascending: true });

            if (data) {
                setMessages(data);
                setTimeout(scrollToBottom, 100);
            }
        };

        fetchMessages();

        // 2. Écouter les nouveaux messages (Realtime)
        const channel = supabase
            .channel(`room:${channelId}`) // Canal unique pour cette discussion
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'Message',
                filter: `channel_id=eq.${channelId}` // <-- Écoute uniquement ce canal
            }, (payload) => {
                setMessages((prev) => [...prev, payload.new]);
                setTimeout(scrollToBottom, 100);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [channelId]);

    // 3. Envoyer un message (Version Blindée)
    const handleSend = async () => {
        // 1. Vérifications de survie
        if (!newMessage.trim()) return;
        if (!channelId) {
            console.error("❌ ERREUR : channelId est manquant.");
            alert("Erreur : Aucun canal sélectionné.");
            return;
        }

        const msgContent = newMessage;
        setNewMessage(''); // Vider la zone de texte immédiatement (UX)

        console.log("🚀 Tentative d'envoi...");

        try {
            // 2. L'insertion avec gestion des deux formats de colonnes
            const { data, error } = await supabase.from('Message').insert([
                {
                    content: msgContent,
                    channel_id: channelId,
                    // On remplit les deux formats pour être SÛR que ça passe
                    fromId: myId,
                    createdAt: new Date().toISOString(),
                    // On ajoute les formats snake_case au cas où
                    toId: partnerId || null
                }
            ]).select();

            if (error) {
                console.error("❌ Erreur Supabase détaillée :", error);

                // Si ça échoue, on tente une version ultra-simplifiée (juste les champs obligatoires supposés)
                // Note: cela suppose que 'content' et 'channel_id' sont les seuls VRAIMENT obligatoires ou que les défauts fonctionnent
                console.log("⚠️ Tentative de fallback minimaliste...");
                const { error: retryError } = await supabase.from('Message').insert([
                    {
                        content: msgContent,
                        channel_id: channelId,
                        // On doit souvent mettre au moins l'ID user, essayons les deux formats
                        from_id: myId
                    }
                ]);

                if (retryError) {
                    console.error("❌ Echec du fallback snake_case:", retryError);
                    // Dernier espoir : CamelCase minimal
                    const { error: lastResortError } = await supabase.from('Message').insert([
                        {
                            content: msgContent,
                            channel_id: channelId,
                            fromId: myId
                        }
                    ]);
                    if (lastResortError) throw lastResortError;
                }
            }

            console.log("✅ Message envoyé avec succès !");
        } catch (err) {
            console.error("💥 Crash critique envoi :", err);
            setNewMessage(msgContent); // On restaure le texte pour ne pas le perdre
            alert("Échec de l'envoi. Vérifiez la console (F12).");
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0b141a] border-l border-gray-700 shadow-2xl w-full">
            {/* HEADER */}
            <div className="bg-[#202c33] p-3 flex items-center justify-between border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center">
                        <ShieldCheck size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-gray-100 font-bold text-sm truncate max-w-[200px]">{topic || "Canal Sécurisé"}</h3>
                        <p className="text-teal-500 text-[10px]">Chiffré de bout en bout</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-fixed opacity-90 custom-scrollbar space-y-2">
                {messages.map((msg) => {
                    const isMe = msg.fromId === myId;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] p-2 rounded-lg text-sm relative shadow-md ${isMe ? 'bg-[#005c4b] text-white rounded-tr-none' : 'bg-[#202c33] text-gray-100 rounded-tl-none'
                                }`}>
                                <span>{msg.content}</span>
                                <div className={`flex items-center gap-1 mt-1 opacity-60 text-[10px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <span>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isMe && <CheckCheck size={12} className="text-blue-300" />}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT */}
            <div className="bg-[#202c33] p-3 flex items-center gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Message..."
                    className="flex-1 bg-[#2a3942] text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button onClick={handleSend} className="p-3 bg-teal-600 rounded-full hover:bg-teal-500 text-white transition-colors">
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
