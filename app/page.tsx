'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, UserPlus, ArrowRight, Loader2, Cpu, ShieldCheck } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  // États
  const [view, setView] = useState<'login' | 'create'>('create'); // On commence par CREATE pour tester
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // États Formulaire
  const [profileId, setProfileId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --- ACTION : SE CONNECTER ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        router.push(`/dashboard?profileId=${profileId}`);
      } else {
        setError(data.error || "Identifiant incorrect.");
      }
    } catch (err) { setError("Erreur serveur."); }
    finally { setLoading(false); }
  };

  // --- ACTION : CRÉER UN CLONE (NOUVEAU) ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');

    // Validation locale
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (profileId.includes(' ')) {
      setError("L'identifiant ne doit pas contenir d'espaces.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/profile/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg("Clone généré avec succès ! Connexion en cours...");
        // Auto-login après 1.5 secondes
        setTimeout(() => {
          router.push(`/dashboard?profileId=${profileId}`);
        }, 1500);
      } else {
        setError(data.error || "Erreur de création.");
        setLoading(false);
      }
    } catch (err) {
      setError("Erreur technique.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden relative flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/40 via-black to-black"></div>

      <div className="z-10 w-full max-w-md">
        {/* LOGO */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 rounded-2xl border border-slate-700 shadow-[0_0_30px_rgba(147,51,234,0.3)] mb-4 animate-pulse">
            <Cpu className="w-10 h-10 text-purple-500" />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter bg-gradient-to-r from-white via-purple-200 to-slate-400 bg-clip-text text-transparent">ANTIGRAVITY</h1>
          <p className="text-slate-500 text-sm tracking-widest mt-2 uppercase">Système de Jumeau Numérique V2</p>
        </div>

        {/* BOITE PRINCIPALE */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-8 rounded-2xl shadow-2xl relative overflow-hidden">

          {/* Onglets */}
          <div className="flex mb-6 border-b border-slate-700 pb-1">
            <button onClick={() => { setView('login'); setError(''); }} className={`flex-1 pb-3 text-sm font-bold transition-all ${view === 'login' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-slate-500 hover:text-slate-300'}`}>CONNEXION</button>
            <button onClick={() => { setView('create'); setError(''); }} className={`flex-1 pb-3 text-sm font-bold transition-all ${view === 'create' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}>INITIALISATION</button>
          </div>

          {/* FORMULAIRE LOGIN */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">IDENTIFIANT</label>
                <div className="relative"><input type="text" value={profileId} onChange={(e) => setProfileId(e.target.value)} placeholder="ex: neo" className="w-full bg-black/50 border border-slate-600 rounded-lg py-3 px-4 pl-10 text-white focus:border-purple-500 outline-none" /><div className="absolute left-3 top-3.5 text-slate-500"><UserPlus size={16} /></div></div>
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">CLÉ</label>
                <div className="relative"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="•••••••" className="w-full bg-black/50 border border-slate-600 rounded-lg py-3 px-4 pl-10 text-white focus:border-purple-500 outline-none" /><div className="absolute left-3 top-3.5 text-slate-500"><Lock size={16} /></div></div>
              </div>
              {error && <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded border border-red-500/30">⚠️ {error}</div>}
              <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all mt-2">
                {loading ? <Loader2 className="animate-spin" /> : <>CONNEXION <ArrowRight size={18} /></>}
              </button>
            </form>
          )}

          {/* FORMULAIRE CREATE */}
          {view === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
              <div>
                <label className="block text-xs font-mono text-blue-400 mb-1">NOM DU CLONE</label>
                <input type="text" value={profileId} onChange={(e) => setProfileId(e.target.value)} placeholder="ex: trinity" className="w-full bg-black/50 border border-blue-500/50 rounded-lg py-3 px-4 text-white focus:border-blue-400 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono text-blue-400 mb-1">MOT DE PASSE</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/50 border border-slate-600 rounded-lg py-3 px-4 text-white focus:border-blue-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">CONFIRMATION</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-black/50 border border-slate-600 rounded-lg py-3 px-4 text-white focus:border-blue-400 outline-none" />
                </div>
              </div>

              {error && <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded border border-red-500/30">⚠️ {error}</div>}
              {successMsg && <div className="text-green-400 text-xs bg-green-900/20 p-2 rounded border border-green-500/30 flex items-center gap-2"><ShieldCheck size={14} /> {successMsg}</div>}

              <button type="submit" disabled={loading || !!successMsg} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all mt-2">
                {loading ? <Loader2 className="animate-spin" /> : <>GÉNÉRER LE JUMEAU <Cpu size={18} /></>}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}