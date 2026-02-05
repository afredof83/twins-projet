import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nouvelle syntaxe officielle pour Next.js 15/16
  // Cela dit à Next.js : "Ne touche pas à ce paquet, laisse-le au serveur Node.js"
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
