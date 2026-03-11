'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { generateAndStoreKeyPair } from '@/lib/crypto-client';

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
            
            // 🚨 NOUVEAU: CHARGEMENT DE LA CLÉ PRIVÉE EN RAM si login
            if (actionType === 'login') {
                const { unlockLocalVault } = await import('@/lib/crypto-client');
                try {
                    await unlockLocalVault(password);
                } catch (vaultErr) {
                    console.error("Échec du déverrouillage du coffre: ", vaultErr);
                    // On laisse quand même continuer si jamais l'utilisateur n'a pas de coffre
                    // mais il devra recréer une clé s'il n'en a pas.
                }
            }

        const response = await fetch(getApiUrl('/api/auth/sync-profile'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authData.session.access_token}`
          }
        });

        if (!response.ok) {
          setError(`Alerte Ipse : La synchronisation du profil a échoué.`);
        }

        // 1. On récupère AUSSI la publicKey
        const { data: profile } = await supabase.from('Profile').select('id, publicKey').eq('id', authData.user.id).single();

        // 2. On vérifie la PRÉSENCE DU PROFIL ET DE LA CLÉ
        if (profile && profile.publicKey) {
            console.log("✅ Agent Ipse validé avec succès ! Clé présente.");
            // L'onboarding est VRAIMENT terminé
            router.push('/');
            router.refresh();
        } else {
            console.log("⚠️ Profil incomplet ou clé manquante. Génération en cours...");
            
            // 3. ICI TU GÉNÈRES TES CLÉS WEBCRYPTO (Paire publique/privée)
            const { publicKeyJwk } = await generateAndStoreKeyPair(password); 
            // We use the full Base64-encoded string as expected by the server
            const newPublicKey = btoa(JSON.stringify(publicKeyJwk));
            
            // 4. ET ICI SEULEMENT TU FAIS TON UPDATE SUR SUPABASE
            const { error: updateError } = await supabase
                .from('Profile')
                .update({ publicKey: newPublicKey }) // On injecte la clé générée
                .eq('id', authData.user.id);

            if (updateError) {
                console.error("❌ Échec de la sauvegarde de la clé publique", updateError);
                throw updateError;
            }
            
            console.log("✅ Clé publique sauvegardée avec succès sur le Web !");
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