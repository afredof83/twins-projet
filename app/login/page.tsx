'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

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

    // ==========================================
    // 1. BLOC CONNEXION (LOGIN)
    // ==========================================
    if (actionType === 'login') {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (authData.user && authData.session) {
        try {
          console.log("🔍 Vérification du profil côté client...");

          // 🛡️ FIX : Utilisation de l'URL relative pour éviter l'erreur "Failed to fetch" (CORS)
          await fetch('/api/auth/sync-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authData.session.access_token}`
            }
          });

          const { unlockLocalVault, wrapKeyWithSession } = await import('@/lib/crypto-client');

          // Le bloc de SURVIE CRYPTOGRAPHIQUE (Fallback)
          try {
            console.log("Tentative de déverrouillage du coffre local...");
            const privateKey = await unlockLocalVault(password);
            await wrapKeyWithSession(privateKey, authData.session.access_token);
            console.log("✅ Connexion et déchiffrement réussis.");
          } catch (cryptoError: any) {
            if (cryptoError.message && cryptoError.message.includes("Aucun coffre local")) {
              console.warn("⚠️ Nouveau navigateur détecté. Auto-génération de nouvelles clés E2EE...");
              const { generateAndStoreKeyPair, unlockLocalVault: unlockAfterGen } = await import('@/lib/crypto-client');
              const { publicKeyJwk } = await generateAndStoreKeyPair(password);
              const newPublicKeyBase64 = btoa(JSON.stringify(publicKeyJwk));

              await supabase
                .from('profiles')
                .update({ public_key: newPublicKeyBase64 })
                .eq('user_id', authData.user.id)
                .eq('type', 'WORK');

              const newPrivateKey = await unlockAfterGen(password);
              await wrapKeyWithSession(newPrivateKey, authData.session.access_token);
            } else {
              console.error("Erreur fatale de déchiffrement :", cryptoError);
              setError("Mot de passe incorrect pour le coffre-fort local.");
              setLoading(false);
              return;
            }
          }

          router.push('/');
          router.refresh();

        } catch (err) {
          console.error("Erreur inattendue:", err);
          setError("Erreur inattendue lors de la vérification.");
          setLoading(false);
        }
      } else if (!authData.session) {
        setError("⚠️ Agent Ipse : Session invalide ou email non confirmé.");
        setLoading(false);
      }
    }
    // ==========================================
    // 2. BLOC INSCRIPTION (SIGNUP)
    // ==========================================
    else {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` }
      });

      if (authError) {
        console.error("Erreur d'inscription :", authError.message);
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (authData.user) {
        try {
          console.log("🚀 Nouvel utilisateur créé. Génération de l'identité cryptographique (E2EE)...");

          if (authData.session) {
            // 🛡️ FIX : Utilisation de l'URL relative ici aussi
            await fetch('/api/auth/sync-profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authData.session.access_token}`
              }
            });
          }

          const { generateAndStoreKeyPair, wrapKeyWithSession, unlockLocalVault } = await import('@/lib/crypto-client');

          // Création du Coffre Local et des Clés
          const { publicKeyJwk } = await generateAndStoreKeyPair(password);
          const newPublicKey = btoa(JSON.stringify(publicKeyJwk));

          // On pousse la Clé Publique fraîchement générée dans la table profiles
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ public_key: newPublicKey })
            .eq('user_id', authData.user.id)
            .eq('type', 'WORK');

          if (updateError) {
            console.error("❌ Échec de la sauvegarde de la clé publique dans Supabase :", updateError);
          } else {
            console.log("✅ Profil E2EE initialisé avec succès !");
          }

          // Si Supabase auto-connecte l'utilisateur, on sécurise la session
          if (authData.session) {
            const privateKey = await unlockLocalVault(password);
            await wrapKeyWithSession(privateKey, authData.session.access_token);
          }

        } catch (cryptoError) {
          console.error("❌ Échec critique lors de la génération des clés :", cryptoError);
        }
      }

      if (!authData.session) {
        setError("⚠️ Agent Ipse : Inscription réussie ! Veuillez vérifier votre email pour confirmer votre compte.");
      } else {
        router.push('/');
        router.refresh();
      }
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