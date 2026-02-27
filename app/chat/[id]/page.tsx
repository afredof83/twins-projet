import prisma from '@/lib/prisma';
import { Shield, Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { sendMessage } from '@/app/actions/chat';
import RealtimeChat from '@/app/components/RealtimeChat';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';

export default async function SecureChatPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const receiverId = resolvedParams.id;

    // Get the logged in user using Supabase Auth
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/auth-page'); // Ou vers la page de login appropriée
    }

    const currentUserId = user.id;

    // Récupérer l'historique de la conversation
    const messages = await prisma.message.findMany({
        where: {
            OR: [
                { senderId: currentUserId, receiverId: receiverId },
                { senderId: receiverId, receiverId: currentUserId }
            ]
        },
        orderBy: { createdAt: 'asc' }
    });

    return (
        <div className="flex flex-col h-screen bg-slate-950 p-4 md:p-8 animate-in fade-in duration-500">

            {/* HEADER TACTIQUE */}
            <header className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 text-emerald-400 mb-1">
                            <Shield className="w-3 h-3" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Liaison Chiffrée</span>
                        </div>
                        <h1 className="text-xl font-black italic tracking-tighter text-white">Agent Industriel</h1>
                    </div>
                </div>
                <div className="px-3 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400 font-mono animate-pulse">
                    EN LIGNE
                </div>
            </header>

            {/* ZONE DES MESSAGES EN TEMPS RÉEL */}
            <RealtimeChat
                initialMessages={messages}
                currentUserId={currentUserId}
                receiverId={receiverId}
            />

            {/* CONSOLE DE SAISIE */}
            <div className="shrink-0 pt-4">
                <form action={sendMessage} className="flex gap-2">
                    <input type="hidden" name="receiverId" value={receiverId} />
                    <input
                        type="text"
                        name="content"
                        placeholder="Entrez votre message tactique..."
                        autoComplete="off"
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm text-white outline-none focus:border-blue-500/50 transition-colors"
                    />
                    <button
                        type="submit"
                        className="px-6 py-4 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 transition-all active:scale-95 flex items-center justify-center"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
