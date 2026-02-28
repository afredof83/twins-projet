// app/page.tsx
import { Target, Zap, Trash2, ExternalLink, ShieldCheck, RefreshCw, Check, LockOpen, ArrowRight } from 'lucide-react';
import { deleteDiscovery, forceHuntSync } from '@/app/actions/cortex'; // Ton action de suppression
import { requestConnection, acceptConnection } from '@/app/actions/connection';
import LearningAlert from '@/app/components/LearningAlert';
import TestNotificationButton from '@/app/components/TestNotificationButton';

import prisma from '@/lib/prisma';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Link from 'next/link';

export default async function RadarPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // Safe fallback
  const currentUserId = user.id;

  // Récupération des données
  const discoveries = await prisma.discovery.findMany({
    where: { profileId: currentUserId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  const incomingRequests = await prisma.connection.findMany({
    where: { receiverId: currentUserId, status: "PENDING" },
    include: { initiator: true },
    orderBy: { createdAt: 'desc' }
  });

  const activeChannels = await prisma.connection.findMany({
    where: {
      OR: [
        { initiatorId: currentUserId },
        { receiverId: currentUserId }
      ],
      status: "ACCEPTED"
    },
    include: { initiator: true, receiver: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-4 md:p-8 space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-blue-400 mb-1 font-mono">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Live Intelligence</span>
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white">RADAR</h1>
        </div>

        {/* Le bouton Sync de test local */}
        <form action={forceHuntSync}>
          <button type="submit" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all group">
            <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Sync</span>
          </button>
        </form>
      </header>

      {/* 🤖 Alerte d'apprentissage de l'Agent */}
      <LearningAlert />

      {/* 🔴 Bouton de test Push Notification */}
      <TestNotificationButton userId={currentUserId} />

      {/* SECTION 1: Requêtes Entrantes */}
      {incomingRequests.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <h2 className="text-sm font-bold uppercase tracking-widest">Requêtes Entrantes</h2>
          </div>
          <div className="grid gap-4">
            {incomingRequests.map((req: any) => (
              <div key={req.id} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex justify-between items-center backdrop-blur-sm">
                <div>
                  <p className="text-sm text-emerald-300 font-mono">Agent ID: {req.initiatorId.slice(0, 8)}...</p>
                  <p className="text-xs text-slate-400 mt-1">Souhaite établir une liaison chiffrée</p>
                </div>
                <form action={acceptConnection}>
                  <input type="hidden" name="connectionId" value={req.id} />
                  <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors border border-emerald-500/30">
                    <Check className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Accepter</span>
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 2: Canaux Actifs */}
      {activeChannels.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-blue-400">
            <LockOpen className="w-4 h-4" />
            <h2 className="text-sm font-bold uppercase tracking-widest">Canaux Sécurisés</h2>
          </div>
          <div className="grid gap-4">
            {activeChannels.map((channel: any) => {
              const targetUser = channel.initiatorId === currentUserId ? channel.receiver : channel.initiator;
              return (
                <div key={channel.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex justify-between items-center hover:border-blue-500/30 transition-colors group">
                  <div>
                    <p className="text-sm text-white font-bold">{targetUser.role || "Agent Inconnu"}</p>
                    <p className="text-xs text-slate-500 font-mono mt-1">ID: {targetUser.id.slice(0, 8)}...</p>
                  </div>
                  <Link href={`/chat/${targetUser.id}`} className="p-3 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all group-hover:scale-105">
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* SECTION 3: Découvertes Radar */}
      <section className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-slate-400">
          <Target className="w-4 h-4" />
          <h2 className="text-sm font-bold uppercase tracking-widest">Opportunités Détectées</h2>
        </div>

        {discoveries.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl">
            <p className="text-gray-500">Aucune opportunité critique détectée pour le moment.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {discoveries.map((item) => (
              <div key={item.id} className="relative group overflow-hidden p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md hover:border-blue-500/40 transition-all">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_15px_#3b82f6] opacity-50" />

                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">MATCH {item.score}%</div>
                      <h3 className="font-bold text-lg text-white">{item.title}</h3>
                    </div>
                    <p className="text-xs font-mono text-slate-500 uppercase">{item.company || 'Source Web'}</p>
                    {item.reason && (
                      <p className="text-sm text-slate-400 leading-relaxed max-w-md italic">"{item.reason}"</p>
                    )}
                  </div>

                  <div className="flex flex-row md:flex-col gap-3 items-end w-full md:w-auto mt-4 md:mt-0">
                    <div className="flex gap-2 ml-auto w-full md:w-auto">
                      {item.url && (
                        <form action={async () => {
                          "use server";
                          await requestConnection(item.url!);
                        }} className="flex-1 md:flex-none">
                          <button type="submit" className="w-full md:w-auto px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-wider transition-all">
                            Initier le contact
                          </button>
                        </form>
                      )}
                      <form action={deleteDiscovery}>
                        <input type="hidden" name="id" value={item.id} />
                        <button type="submit" className="p-2 h-full rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}