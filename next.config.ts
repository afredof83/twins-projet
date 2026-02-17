import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Pour le fond de carte tactique
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Pour les avatars Google
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com', // Au cas où
      },
      {
        protocol: 'https',
        hostname: 'vljiMnqXlS.supabase.co', // Adapt if necessary or use wildcard
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co', // General Supabase wildcard
      }
    ],
  },
};

export default nextConfig;