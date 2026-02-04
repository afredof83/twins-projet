'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [savedProfile, setSavedProfile] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for saved profile
    const savedId = localStorage.getItem('twins_last_id');
    const savedName = localStorage.getItem('twins_last_name');

    if (savedId) {
      setSavedProfile({
        id: savedId,
        name: savedName || 'Mon Profil',
      });
    }
    setLoading(false);
  }, []);

  const handleClearProfile = () => {
    localStorage.removeItem('twins_last_id');
    localStorage.removeItem('twins_last_name');
    setSavedProfile(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-purple-400 text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4">
      <main className="max-w-2xl w-full text-center">
        {/* Logo/Title */}
        <div className="mb-12">
          <div className="inline-block mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-purple-500/50">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            Digital Twin
          </h1>
          <p className="text-xl text-purple-300 mb-2">
            Votre Jumeau Numérique Sécurisé
          </p>
          <p className="text-sm text-purple-400/70">
            🔐 Chiffrement Zero-Knowledge • AES-256-GCM
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {savedProfile ? (
            <>
              {/* Unlock Saved Profile */}
              <Link
                href={`/profile/unlock?id=${savedProfile.id}`}
                className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-8 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transform hover:scale-105"
              >
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  <span>Déverrouiller {savedProfile.name}</span>
                </div>
              </Link>

              {/* Profile Info */}
              <div className="bg-slate-800/50 backdrop-blur border border-purple-500/30 rounded-lg p-4">
                <p className="text-purple-300 text-sm mb-2">Dernier profil utilisé</p>
                <p className="text-white font-semibold">{savedProfile.name}</p>
                <p className="text-purple-400/70 text-xs font-mono mt-1">
                  ID: {savedProfile.id.slice(0, 12)}...
                </p>
                <button
                  onClick={handleClearProfile}
                  className="text-red-400 hover:text-red-300 text-xs mt-3 underline"
                >
                  Oublier ce profil
                </button>
              </div>

              {/* Secondary: Create New */}
              <Link
                href="/profile/new"
                className="block w-full bg-slate-800/50 backdrop-blur border border-purple-500/30 text-purple-300 font-semibold py-3 px-6 rounded-lg hover:bg-slate-800/70 hover:border-purple-500/50 transition-all"
              >
                + Créer un nouveau profil
              </Link>
            </>
          ) : (
            <>
              {/* No Saved Profile - Primary CTA */}
              <Link
                href="/profile/new"
                className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-8 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transform hover:scale-105"
              >
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Créer Mon Jumeau Numérique</span>
                </div>
              </Link>

              {/* Info Card */}
              <div className="bg-slate-800/50 backdrop-blur border border-purple-500/30 rounded-lg p-6 text-left">
                <h3 className="text-purple-300 font-semibold mb-3">Pourquoi un Jumeau Numérique ?</h3>
                <ul className="space-y-2 text-sm text-purple-200/80">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">✓</span>
                    <span>Stockez vos souvenirs de manière sécurisée</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">✓</span>
                    <span>Chiffrement Zero-Knowledge (vos données restent privées)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">✓</span>
                    <span>Mémoire vectorielle pour recherche sémantique</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">✓</span>
                    <span>Phrase de récupération BIP39 (12 mots)</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-purple-400/50">
          <p>Propulsé par Next.js • Prisma • Supabase pgvector</p>
        </div>
      </main>
    </div>
  );
}
