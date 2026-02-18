'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, UserCircle, Radar } from 'lucide-react';

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/90 backdrop-blur-2xl border border-green-900/40 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)]">

                {/* CORTEX : Archives de données */}
                <Link href="/memories" className={`group flex flex-col items-center min-w-[70px] p-2 rounded-full transition-all ${pathname === '/memories' ? 'bg-blue-500/10' : ''}`}>
                    <Database className={`w-5 h-5 ${pathname === '/memories' ? 'text-blue-400' : 'text-blue-900 group-hover:text-blue-400'}`} />
                    <span className="text-[8px] uppercase mt-1 font-bold tracking-tighter text-blue-900">Cortex</span>
                </Link>

                {/* SÉPARATEUR */}
                <div className="h-6 w-[1px] bg-green-900/20 mx-2" />

                {/* SCAN : Centre de Commande (Dashboard) */}
                <Link href="/dashboard" className="relative group flex flex-col items-center">
                    <div className={`p-4 rounded-full border-2 transition-all duration-500 ${pathname === '/dashboard'
                            ? 'bg-orange-500/20 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                            : 'bg-orange-500/5 border-orange-900/50 hover:border-orange-500'
                        }`}>
                        <Radar className={`w-7 h-7 ${pathname === '/dashboard' ? 'text-orange-500 animate-[spin_4s_linear_infinite]' : 'text-orange-900 group-hover:text-orange-500'}`} />
                    </div>
                    <span className="text-[9px] uppercase mt-1 font-black tracking-widest text-orange-900 group-hover:text-orange-500">Scan</span>

                    {/* Effet Neural Pulse */}
                    {pathname === '/dashboard' && (
                        <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping -z-10" />
                    )}
                </Link>

                {/* SÉPARATEUR */}
                <div className="h-6 w-[1px] bg-green-900/20 mx-2" />

                {/* IDENTITÉ : Profil Agent */}
                <Link href="/profile" className={`group flex flex-col items-center min-w-[70px] p-2 rounded-full transition-all ${pathname === '/profile' ? 'bg-green-500/10' : ''}`}>
                    <UserCircle className={`w-5 h-5 ${pathname === '/profile' ? 'text-green-400' : 'text-green-900 group-hover:text-green-400'}`} />
                    <span className="text-[8px] uppercase mt-1 font-bold tracking-tighter text-green-900">Identité</span>
                </Link>

            </div>
        </div>
    );
}
