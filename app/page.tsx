'use client';

import { useState, useEffect, Suspense } from 'react';
import { Loader2, Target, Zap, ShieldCheck, LockOpen, RefreshCw } from 'lucide-react';
import { getAgentName } from '@/lib/utils';
import { createClient } from '@/lib/supabaseBrowser';
import { getApiUrl } from '@/lib/api-config';
import RadarPoller from '@/app/components/RadarPoller';
import LearningAlert from '@/app/components/LearningAlert';
import RadarMatchCard from '@/app/components/RadarMatchCard';
import AcceptConnectionButton from '@/app/components/AcceptConnectionButton';
import ActiveChannelsList from '@/app/components/ActiveChannelsList';

function RadarContent() {
  const [user, setUser] = useState<any>(null);
  const [discoveries, setDiscoveries] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [activeChannels, setActiveChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const supabase = createClient();

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUser(session.user);

      // ⚡ NOUVEAU : On prépare le badge de sécurité pour l'API
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // On ajoute les headers aux requêtes
      const oppsRes = await fetch(getApiUrl('/api/opportunities'), { headers }).then(r => r.json());
      if (oppsRes.success) {
        setDiscoveries(oppsRes.opportunities.filter((o: any) => o.status !== 'CANCELLED').slice(0, 10));
      }

      const connRes = await fetch(getApiUrl('/api/connection'), { headers }).then(r => r.json());
      if (connRes.success) {
        setIncomingRequests(connRes.incoming);
        setActiveChannels(connRes.active);
      }
    } catch (e) {
      console.error("fetchData error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(getApiUrl('/api/opportunities'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'scout' })
      }).then(r => r.json());

      if (res.success) {
        await fetchData();
      }
    } catch (e) {
      console.error("Sync error", e);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-mono">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        INIT RADAR...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 space-y-8">
      <RadarPoller />
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-blue-400 mb-1 font-mono">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Live Intelligence</span>
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white">RADAR</h1>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all group disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {syncing ? 'SYNCING...' : 'Sync'}
          </span>
        </button>
      </header>

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
                <AcceptConnectionButton connectionId={req.id} onAccept={fetchData} />
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
          <ActiveChannelsList activeChannels={activeChannels} currentUserId={user.id} />
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
              <RadarMatchCard key={opp.id} opportunity={opp} myId={user.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function RadarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-mono">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        LOADING...
      </div>
    }>
      <RadarContent />
    </Suspense>
  );
}