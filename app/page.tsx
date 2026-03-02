// app/page.tsx
import { requestConnection, acceptConnection } from '@/app/actions/connection';
import LearningAlert from '@/app/components/LearningAlert';
import DeleteChannelButton from '@/app/components/DeleteChannelButton';
import RadarMatchCard from '@/app/components/RadarMatchCard';
import { Target, Zap, ShieldCheck, Check, LockOpen, ArrowRight, RefreshCw } from 'lucide-react';
import { forceHuntSync } from '@/app/actions/radar';
import { getAgentName } from '@/lib/utils';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Link from 'next/link';

import ActiveChannelsList from '@/app/components/ActiveChannelsList';

export const dynamic = 'force-dynamic';

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
  const discoveries = await prisma.opportunity.findMany({
    where: {
      OR: [
        { sourceId: currentUserId },
        { targetId: currentUserId }
      ],
      status: { not: 'CANCELLED' }
    },
    orderBy: { createdAt: 'desc' },
    include: {
      sourceProfile: true, // Pour savoir qui a initié
      targetProfile: true  // Pour savoir qui est la cible
    },
    take: 10
  });

  console.log(`🖥️ [FRONTEND] User connecté : ${currentUserId}`);
  console.log(`🖥️ [FRONTEND] Nombre d'opportunités à afficher : ${discoveries.length}`);

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
                  <p className="text-sm text-emerald-300 font-mono">Agent: {getAgentName(req.initiator)}</p>
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
          <ActiveChannelsList activeChannels={activeChannels} currentUserId={currentUserId} />
        </section>
      )}

      {/* SECTION 3: Découvertes Radar */}
      <section className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-slate-400">
          <Target className="w-4 h-4" />
          <h2 className="text-sm font-bold uppercase tracking-widest">Synergies détectées par votre Agent</h2>
        </div>

        {discoveries.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl">
            <p className="text-gray-500">Aucune opportunité critique détectée pour le moment.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {discoveries.map((opp: any) => (
              <RadarMatchCard key={opp.id} opportunity={opp} myId={currentUserId} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
// Déploiement Vercel - Ipse Phase 5