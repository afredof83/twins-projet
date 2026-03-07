'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Radar, BrainCircuit, Fingerprint } from 'lucide-react';
import SplashHider from './SplashHider';
import PushManager from './PushManager';
import Gatekeeper from '@/app/components/auth/Gatekeeper';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/onboarding' || pathname === '/_not-found';

    return (
        <>
            <SplashHider />

            {/* PushManager sera maintenant responsable de son propre auth sur le client */}
            {!isAuthPage && <PushManager />}

            <Gatekeeper>
                <div className="relative z-0">
                    {children}
                </div>
            </Gatekeeper>

            {/* --- BOTTOM NAVIGATION BAR --- */}
            {!isAuthPage && (
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
            )}
        </>
    );
}
