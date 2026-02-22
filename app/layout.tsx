import type { Metadata, Viewport } from "next";
import "./globals.css";
import TopNav from '@/components/TopNav';
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
      <body className="bg-background-dark text-slate-300 antialiased overflow-hidden">
        <TopNav />
        {children}
      </body>
    </html>
  );
}
