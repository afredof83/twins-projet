'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Radar, TrendingUp, Zap } from 'lucide-react';

interface RadarResult {
  id: string;
  title: string;
  reasoning: string;
  sourceUrl: string;
  priority: number;
  createdAt: string;
}

export default function Dashboard() {
  const [results, setResults] = useState<RadarResult[]>([]);
  const [loading, setLoading] = useState(true);

  // À terme, l'ID viendra de ton système d'auth
  const USER_ID = "28de7876-17a4-4648-8f78-544dcea980f1";

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/radar/results?userId=${USER_ID}`);
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error("Erreur de récupération:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-20">
      {/* Header Statut */}
      <header className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Twins Agent
          </h1>
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Radar IA en patrouille
          </p>
        </div>
        <div className="bg-slate-900 p-2 rounded-full">
          <Radar className="w-6 h-6 text-blue-400" />
        </div>
      </header>

      {/* Liste des Opportunités */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20 text-slate-500 animate-pulse">
            Analyse des données en cours...
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
            Aucune pépite trouvée pour le moment.
          </div>
        ) : (
          results.map((item) => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 transition-transform active:scale-95">
              <div className="flex justify-between items-start mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${item.priority >= 9 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                  <Zap className="w-3 h-3" />
                  Score {item.priority}/10
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>

              <h2 className="text-lg font-semibold mb-2 leading-tight">
                {item.title}
              </h2>

              <p className="text-slate-400 text-sm mb-4 line-clamp-3">
                {item.reasoning}
              </p>

              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                Explorer la source
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
