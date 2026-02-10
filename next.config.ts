import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cette option est CRUCIALE pour les modules natifs comme pdf-parse ou canvas
  serverExternalPackages: ['pdf-parse'],

  // Optionnel : Désactive certains checks stricts si nécessaire
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
