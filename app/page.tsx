"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(result => {
        setData(result);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Chargement du Centre de Commandes...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-md mx-auto space-y-8">

        {/* En-tête / Bienvenue */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Bonjour, {data.profile?.name || 'Agent'} 👋</h1>
            <p className="text-gray-400">Prêt pour de nouvelles opportunités ?</p>
          </div>
          {/* Un petit bouton pour aller modifier son profil */}
          <Link href="/profile" className="bg-gray-800 p-3 rounded-full hover:bg-gray-700 transition">
            ⚙️
          </Link>
        </header>

        {/* Statistiques (Les Widgets) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-5">
            <h3 className="text-gray-400 text-sm font-medium mb-1">Pépites trouvées</h3>
            <p className="text-4xl font-bold text-blue-400">{data.totalResults}</p>
          </div>
          <div className="bg-green-900/30 border border-green-800 rounded-xl p-5">
            <h3 className="text-gray-400 text-sm font-medium mb-1">Statut IA</h3>
            <p className="text-xl font-bold text-green-400 mt-2 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              En veille
            </p>
          </div>
        </div>

        {/* Liste des dernières pépites */}
        <div>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold">Dernières découvertes</h2>
            <span className="text-sm text-gray-500">Les 3 plus récentes</span>
          </div>

          <div className="space-y-4">
            {data.recentResults && data.recentResults.length > 0 ? (
              data.recentResults.map((pepite: any) => (
                <a
                  key={pepite.id}
                  href={pepite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-blue-500 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg leading-tight pr-4">{pepite.title}</h3>
                    <span className="bg-green-900 text-green-400 text-xs font-bold px-2 py-1 rounded">
                      {pepite.score}/10
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2">{pepite.description}</p>
                </a>
              ))
            ) : (
              <div className="text-center bg-gray-800 border border-gray-700 rounded-xl p-8 text-gray-400">
                Aucune pépite pour le moment. L'Agent fouille le web...
              </div>
            )}
          </div>
        </div>

        {/* Bouton pour forcer un scan MANUEL (Optionnel mais pratique !) */}
        <button
          onClick={() => {
            alert("Ordre envoyé à l'IA ! Vérifie dans 30 secondes.");
            fetch('/api/cron/radar-worker');
          }}
          className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-4 px-4 rounded-xl border border-gray-700 transition flex items-center justify-center gap-2 mt-8"
        >
          <span>🚀</span> Forcer une recherche IA maintenant
        </button>

      </div>
    </div>
  );
}
