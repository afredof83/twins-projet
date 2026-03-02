import prisma from '@/lib/prisma';
import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
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
        redirect('/auth-page');
    }

    const currentUserId = user.id;

    // Récupérer l'historique de la conversation (50 derniers) — BRUT (chiffré)
    const messages = await prisma.message.findMany({
        where: {
            OR: [
                { senderId: currentUserId, receiverId: receiverId },
                { senderId: receiverId, receiverId: currentUserId }
            ]
        },
        take: 50,
        orderBy: { createdAt: 'desc' }
    });

    // ⚠️ Le serveur est AVEUGLE : on ne déchiffre plus ici.
    // Les messages partent tels quels au client. Le RealtimeChat déchiffrera localement.
    const initialMessages = messages.reverse();

    // 📡 Récupérer la clé publique ECDH du destinataire (pour la dérivation côté client)
    const receiverProfile = await prisma.profile.findUnique({
        where: { id: receiverId },
        select: { publicKey: true, name: true }
    });

    const receiverName = receiverProfile?.name || "Agent Industriel";

    return (
        <div className="flex flex-col h-[100dvh] pb-20 bg-slate-950 p-4 md:p-8 animate-in fade-in duration-500">

            {/* HEADER TACTIQUE */}
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
                        <h1 className="text-xl font-black italic tracking-tighter text-white">{receiverName}</h1>
                    </div>
                </div>
                <div className="px-3 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400 font-mono animate-pulse">
                    EN LIGNE
                </div>
            </header>

            {/* ZONE DES MESSAGES ET CONSOLE DE SAISIE EN TEMPS RÉEL */}
            <RealtimeChat
                initialMessages={initialMessages}
                currentUserId={currentUserId}
                receiverId={receiverId}
                receiverPublicKeyJwk={receiverProfile?.publicKey || null}
            />
        </div>
    );
}
