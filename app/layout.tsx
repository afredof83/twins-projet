import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import TopNav from '@/components/TopNav';
import NavBadge from './components/NavBadge'; // Importer le badge
export const runtime = 'nodejs'; // On force la stabilité

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <head>
        {/* On gère les liens ici pour éviter les erreurs */}
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;700&family=Space+Mono&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className="bg-slate-950 text-slate-300 antialiased pb-20">
        {/* Composant de fond à placer dans ton Layout */}
        <div className="fixed inset-0 -z-10 bg-slate-950">
          {/* Grille Blueprint */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

          {/* Halos de lumière (Glows) */}
          <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-emerald-600/10 blur-[120px]" />
        </div>

        {/* Le 'pb-20' ci-dessus laisse de la place pour la barre en bas */}

        <div className="relative z-0">
          {children}
        </div>

        {/* --- BOTTOM NAVIGATION BAR --- */}
        <nav className="fixed bottom-0 left-0 w-full bg-gray-800 border-t border-gray-700 pb-safe z-50">
          <div className="flex justify-around items-center h-16 max-w-md mx-auto">

            <Link href="/" className="relative flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-blue-400 transition">
              <span className="text-xl mb-1 relative">
                📊
                <NavBadge />
              </span>
              <span className="text-xs font-medium">Radar</span>
            </Link>

            <Link href="/cortex" className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-purple-400 transition">
              <span className="text-xl mb-1">🧠</span>
              <span className="text-xs font-medium">Cortex</span>
            </Link>

            <Link href="/profile" className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-green-400 transition">
              <span className="text-xl mb-1">👤</span>
              <span className="text-xs font-medium">Identité</span>
            </Link>

          </div>
        </nav>
        {/* ----------------------------- */}

      </body>
    </html>
  );
}
