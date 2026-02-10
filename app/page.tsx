'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Shield, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');

    try {
      if (mode === 'LOGIN') {
        // --- CONNEXION ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Succès -> Dashboard
        router.push('/dashboard');

      } else {
        // --- INSCRIPTION ---
        // On crée juste le compte Auth. 
        // Le Trigger SQL s'occupe de créer le profil dans la table "Profile" automatiquement.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Important: Empêche l'envoi du mail de confirm si désactivé dans Supabase,
            // mais force la connexion immédiate si possible.
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });

        if (error) throw error;

        // Si l'utilisateur est créé mais pas de session immédiate (confirmation email requise)
        if (data.user && !data.session) {
          setError("Compte créé ! Si demandé, vérifiez vos emails.");
          setMode('LOGIN');
        }
        // Si session immédiate (email confirm désactivé)
        else if (data.session) {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
      <div className="bg-slate-900/50 p-8 rounded-2xl border border-cyan-900/50 shadow-2xl w-full max-w-md backdrop-blur relative">

        <button onClick={() => window.location.reload()} className="absolute top-4 right-4 text-slate-600 hover:text-white" title="Recharger"><RefreshCw size={14} /></button>

        <div className="text-center mb-8">
          <Shield className="w-12 h-12 text-cyan-500 mx-auto mb-4 animate-pulse" />
          <h1 className="text-3xl font-bold tracking-widest">TWINS</h1>
          <p className="text-xs text-cyan-600 uppercase mt-2">Accès Sécurisé v2.6</p>
        </div>

        {/* ONGLETS */}
        <div className="flex mb-6 border-b border-slate-700">
          <button onClick={() => { setMode('LOGIN'); setError('') }} className={`flex-1 pb-2 text-xs font-bold transition-colors ${mode === 'LOGIN' ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-500'}`}>CONNEXION</button>
          <button onClick={() => { setMode('SIGNUP'); setError('') }} className={`flex-1 pb-2 text-xs font-bold transition-colors ${mode === 'SIGNUP' ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-500'}`}>CRÉATION</button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 font-mono ml-1">EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-cyan-100 outline-none focus:border-cyan-500 transition-colors" placeholder="pilote@twins.com" required />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-mono ml-1">MOT DE PASSE</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-cyan-100 outline-none focus:border-cyan-500 transition-colors" placeholder="••••••••" required />
          </div>

          {error && <div className={`text-xs p-3 rounded border ${error.includes('!') ? 'bg-green-900/30 text-green-400 border-green-900' : 'bg-red-900/30 text-red-400 border-red-900'}`}>{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-cyan-900/20">
            {loading ? <Loader2 className="animate-spin" size={18} /> : (mode === 'LOGIN' ? <>ENTRER <ArrowRight size={18} /></> : <>INITIALISER LE JUMEAU <Shield size={18} /></>)}
          </button>
        </form>
      </div>
    </div>
  );
}