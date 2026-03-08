'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shield, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import RealtimeChat from '@/app/components/RealtimeChat';
import { createClient } from '@/lib/supabaseBrowser';
import { getApiUrl } from '@/lib/api';

function ChatContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const receiverId = searchParams.get('id');

    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [receiverProfile, setReceiverProfile] = useState<any>(null);
    const [initialMessages, setInitialMessages] = useState<any[]>([]);

    useEffect(() => {
        const initChat = async () => {
            if (!receiverId) {
                setLoading(false);
                return;
            }

            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }
            setCurrentUserId(user.id);

            try {
                const { data: { session } } = await supabase.auth.getSession();
                const headers: any = { 'Content-Type': 'application/json' };
                if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

                const res = await fetch(getApiUrl(`/api/chat/history?receiverId=${receiverId}`), { headers }).then(r => r.json());
                if (res.success) {
                    setReceiverProfile(res.receiverProfile);
                    setInitialMessages(res.messages);
                }
            } catch (e) {
                console.error("Chat init error", e);
            } finally {
                setLoading(false);
            }
        };

        initChat();
    }, [receiverId, router]);

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin" />
        </div>
    );

    if (!receiverId || (!receiverProfile && !loading)) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
                <Shield className="w-12 h-12 text-slate-800 mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">Canal Introuvable</h1>
                <p className="text-slate-500 mb-8">Le profil de l'agent est inaccessible ou la liaison a été rompue.</p>
                <Link href="/" className="text-emerald-400 hover:text-emerald-300 font-mono text-sm underline">
                    Retour au Tactical Feed
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100dvh] pb-20 bg-slate-950 p-4 md:p-8 animate-in fade-in duration-500">
            <header className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 text-emerald-400 mb-1">
                            <Shield className="w-3 h-3" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Liaison Chiffrée E2E</span>
                        </div>
                        <h1 className="text-xl font-black italic tracking-tighter text-white">
                            {receiverProfile?.name || "Agent Industriel"}
                        </h1>
                    </div>
                </div>
                <div className="px-3 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400 font-mono animate-pulse">
                    EN LIGNE
                </div>
            </header>

            <RealtimeChat
                initialMessages={initialMessages}
                currentUserId={currentUserId!}
                receiverId={receiverId}
                receiverPublicKeyJwk={receiverProfile?.publicKey || null}
            />
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        }>
            <ChatContent />
        </Suspense>
    );
}
