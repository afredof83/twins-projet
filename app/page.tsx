'use client';

import { useState, useEffect, Suspense } from 'react';
import { Loader2, Target, Zap, ShieldCheck, LockOpen, RefreshCw } from 'lucide-react';
import { getAgentName } from '@/lib/utils';
import { createClient } from '@/lib/supabaseBrowser';
import { getApiUrl } from '@/lib/api';
import RadarRealtimeListener from '@/app/components/RadarRealtimeListener';
import LearningAlert from '@/app/components/LearningAlert';
import RadarMatchCard from '@/app/components/RadarMatchCard';
import AcceptConnectionButton from '@/app/components/AcceptConnectionButton';
import { useLanguage } from '@/context/LanguageContext';
import { useCallback } from 'react';

function RadarContent() {
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [discoveries, setDiscoveries] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
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
      }
    } catch (e) {
      console.error("fetchData error", e);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

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
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-mono text-xs uppercase tracking-widest">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        INIT RADAR...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 space-y-8">
      <RadarRealtimeListener onUpdate={fetchData} currentUserId={user.id} />
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-blue-400 mb-1 font-mono">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Live Intelligence</span>
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">{t('radar.title')}</h1>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all group disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {syncing ? t('profile.common.syncing') : 'Sync'}
          </span>
        </button>
      </header>

      <LearningAlert />

      {/* SECTION 1: Requêtes Entrantes */}
      {incomingRequests.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <h2 className="text-sm font-bold uppercase tracking-widest">{t('radar.incoming_requests')}</h2>
          </div>
          <div className="grid gap-4">
            {incomingRequests
              .filter((req: any) => req && req.initiator)
              .map((req: any) => (
                <div key={req.id} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex justify-between items-center backdrop-blur-sm">
                  <div>
                    <p className="text-sm text-emerald-300 font-mono">Agent: {getAgentName(req.initiator)}</p>
                    <p className="text-xs text-slate-400 mt-1">{t('radar.encrypted_link')}</p>
                  </div>
                  <AcceptConnectionButton connectionId={req.id} onAccept={fetchData} />
                </div>
              ))}
          </div>
        </section>
      )}



      {/* SECTION 3: Découvertes Radar */}
      <section className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-slate-400">
          <Target className="w-4 h-4" />
          <h2 className="text-sm font-bold uppercase tracking-widest">{t('radar.subtitle')}</h2>
        </div>

        {discoveries.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl">
            <p className="text-gray-500">{t('radar.empty_state')}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {discoveries
              .filter((opp: any) => opp && opp.id)
              .map((opp: any) => (
                <RadarMatchCard key={opp.id} opportunity={opp} myId={user.id} />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function RadarPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-mono text-xs uppercase tracking-widest">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        {t('profile.common.loading') || 'LOADING...'}
      </div>
    }>
      <RadarContent />
    </Suspense>
  );
}