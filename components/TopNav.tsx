'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, Radar, User, Shield } from 'lucide-react';

export default function TopNav() {
    const pathname = usePathname();

    // 🛡️ SÉCURITÉ : Ne pas afficher le menu sur la page de connexion
    if (pathname === '/' || pathname === '/login') {
        return null;
    }

    return (
        <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* LOGO TACTIQUE */}
                    <div className="flex-shrink-0 flex items-center">
                        <Shield className="text-blue-500 mr-2" size={24} />
                        <span className="font-bold text-white tracking-widest">TWINS</span>
                    </div>

                    {/* LIENS DE NAVIGATION CLASSIQUES */}
                    <div className="flex space-x-4 sm:space-x-8">
                        <Link
                            href="/memories"
                            className={`flex items-center px-3 py-2 text-sm font-medium transition-colors ${pathname.includes('/memories') ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Database size={18} className="mr-2 hidden sm:block" /> CORTEX
                        </Link>

                        <Link
                            href="/dashboard"
                            className={`flex items-center px-3 py-2 text-sm font-medium transition-colors ${pathname.includes('/dashboard') ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Radar size={18} className="mr-2 hidden sm:block" /> SCAN
                        </Link>

                        <Link
                            href="/profile"
                            className={`flex items-center px-3 py-2 text-sm font-medium transition-colors ${pathname.includes('/profile') ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}
                        >
                            <User size={18} className="mr-2 hidden sm:block" /> IDENTITÉ
                        </Link>
                    </div>

                </div>
            </div>
        </nav>
    );
}
