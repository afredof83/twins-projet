'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, UserCircle, Radar } from 'lucide-react';

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/90 backdrop-blur-2xl border border-[var(--primary)]/20 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)]">

                {/* CORTEX : Archives de données */}
                <Link href="/memories" className={`group flex flex-col items-center min-w-[70px] p-2 rounded-full transition-all ${pathname === '/memories' ? 'bg-[var(--primary)]/10' : ''}`}>
                    <Database className={`w-5 h-5 ${pathname === '/memories' ? 'text-[var(--primary)]' : 'text-[var(--text-main)]/20 group-hover:text-[var(--primary)]'}`} />
                    <span className={`text-[8px] uppercase mt-1 font-bold tracking-tighter ${pathname === '/memories' ? 'text-[var(--primary)]' : 'text-[var(--text-main)]/20'}`}>Cortex</span>
                </Link>

                {/* SÉPARATEUR */}
                <div className="h-6 w-[1px] bg-[var(--primary)]/10 mx-2" />

                {/* SCAN : Centre de Commande (Dashboard) */}
                <Link href="/" className="relative group flex flex-col items-center">
                    <div className={`p-4 rounded-full border-2 transition-all duration-500 ${pathname === '/'
                        ? 'bg-[var(--primary)]/20 border-[var(--primary)] shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]'
                        : 'border-[var(--primary)]/20 hover:border-[var(--primary)]'
                        }`}>
                        <Radar className={`w-7 h-7 ${pathname === '/' ? 'text-[var(--primary)]' : 'text-[var(--text-main)]/20 group-hover:text-[var(--primary)]'}`} />
                    </div>
                    <span className={`text-[9px] uppercase mt-1 font-black tracking-widest ${pathname === '/' ? 'text-[var(--primary)]' : 'text-[var(--text-main)]/20 group-hover:text-[var(--primary)]'}`}>Scan</span>
                </Link>

                {/* SÉPARATEUR */}
                <div className="h-6 w-[1px] bg-[var(--primary)]/10 mx-2" />

                {/* IDENTITÉ : Profil Agent */}
                <Link href="/profile" className={`group flex flex-col items-center min-w-[70px] p-2 rounded-full transition-all ${pathname === '/profile' ? 'bg-[var(--primary)]/10' : ''}`}>
                    <UserCircle className={`w-5 h-5 ${pathname === '/profile' ? 'text-[var(--primary)]' : 'text-[var(--text-main)]/20 group-hover:text-[var(--primary)]'}`} />
                    <span className={`text-[8px] uppercase mt-1 font-bold tracking-tighter ${pathname === '/profile' ? 'text-[var(--primary)]' : 'text-[var(--text-main)]/20'}`}>Identité</span>
                </Link>

            </div>
        </div>
    );
}
