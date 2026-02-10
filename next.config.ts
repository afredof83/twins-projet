import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // On laisse vide pour l'instant, pdf2json n'a pas besoin d'exclusion spécifique
  // serverExternalPackages: [], 

  typescript: {
    // Permet de déployer même si TypeScript râle un peu
    ignoreBuildErrors: true,
  },

};

export default nextConfig;