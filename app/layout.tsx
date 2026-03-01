import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Radar, BrainCircuit, Fingerprint } from 'lucide-react';
import "./globals.css";
import TopNav from '@/components/TopNav';
import NavBadge from './components/NavBadge';
import SplashHider from './components/SplashHider';
import PushManager from './components/PushManager';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: "Twins - Mission Control",
  description: "Tactical Mobile Interface",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Twins",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#050a0c",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Récupération de l'utilisateur connecté pour le PushManager
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  );
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="fr" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;700&family=Space+Mono&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className="bg-slate-950 text-slate-300 antialiased pb-20">
        <SplashHider />
        <PushManager userId={user?.id} />
        {/* Composant de fond supprimé ici pour cleanup */}

        {/* Le 'pb-20' ci-dessus laisse de la place pour la barre en bas */}

        <div className="relative z-0">
          {children}
        </div>

        {/* --- BOTTOM NAVIGATION BAR --- */}
        <nav className="fixed bottom-0 left-0 w-full bg-zinc-950/80 backdrop-blur-xl border-t border-white/5 pb-safe z-50">
          <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
            <Link href="/" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-blue-400 transition-colors group">
              <Radar className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Radar</span>
            </Link>
            <Link href="/cortex" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-indigo-400 transition-colors group">
              <BrainCircuit className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Cortex</span>
            </Link>
            <Link href="/profile" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-emerald-400 transition-colors group">
              <Fingerprint className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Identité</span>
            </Link>
          </div>
        </nav>
        {/* ----------------------------- */}

      </body>
    </html>
  );
}
