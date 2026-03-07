'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api-config';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // On stocke l'action (login ou signup) pour savoir quoi faire lors du submit
  const [actionType, setActionType] = useState<'login' | 'signup'>('login');
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Authentification Supabase
    const { data: authData, error: authError } = actionType === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` }
      });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.session) {
      setError("⚠️ Agent Ipse : En attente de confirmation email.");
      setLoading(false);
      return;
    }

    if (authData?.user?.id) {
      try {
        console.log("🔍 Vérification du profil côté client...");

        // On génère la date au format ISO pour la base de données
        const now = new Date().toISOString();

        // On utilise UPSERT : Si le profil n'existe pas il est créé, s'il existe il est mis à jour en douceur.
        // Cela évite l'erreur fatale de l'INSERT sur une clé déjà existante.
        const { error: upsertError } = await supabase
          .from('Profile')
          .upsert({
            id: authData.user.id,
            email: authData.user.email || 'inconnu@email.com',
            name: "Agent Furtif",
            updatedAt: now
          });

        if (upsertError) {
          console.error("🚨 Erreur d'Upsert Supabase :", upsertError.message || upsertError.details || JSON.stringify(upsertError));
          setError(`Erreur BDD : Le profil n'a pas pu être validé.`);
          setLoading(false);
        } else {
          console.log("✅ Agent Ipse validé avec succès !");
          router.push('/');
          router.refresh();
        }
      } catch (err) {
        console.error("Erreur inattendue:", err);
        setError("Erreur inattendue lors de la vérification.");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white/10 p-8 backdrop-blur-lg border border-white/20 shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">Ipse</h1>
        <p className="text-blue-300/80 text-sm mb-6 text-center font-medium uppercase tracking-widest">
          Initialisation de l'Agent Ipse
        </p>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-500/20 border border-red-500 text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-black/50 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Mot de passe (min. 6 caractères)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-black/50 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
          />

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              onClick={() => setActionType('login')}
              disabled={loading}
              className="flex-1 p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50"
            >
              Se connecter
            </button>
            <button
              type="submit"
              onClick={() => setActionType('signup')}
              disabled={loading}
              className="flex-1 p-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition disabled:opacity-50"
            >
              S'inscrire
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}