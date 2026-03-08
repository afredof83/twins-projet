import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientLayout from './components/ClientLayout';
import { LanguageProvider } from '@/context/LanguageContext';

export const metadata: Metadata = {
  title: "Ipse",
  description: "Agent Tactique Mobile",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ipse",
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
  // NOTES: Suppression de cookies() et createServerClient au niveau Layout
  // Car pour un export statique (mobile/Capacitor), le Layout doit être statique.
  // L'authentification est gérée par le Gatekeeper (Client Side).

  return (
    <html lang="fr" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;700&family=Space+Mono&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className="bg-slate-950 text-slate-300 antialiased pb-20">
        <LanguageProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </LanguageProvider>
      </body>
    </html>
  );
}
