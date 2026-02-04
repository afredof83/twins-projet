'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { keyManager } from '@/lib/crypto/key-manager';

export default function Dashboard() {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        if (!keyManager.isSessionActive()) {
            router.push('/');
        } else {
            setAuthorized(true);
        }
    }, [router]);

    if (!authorized) return null;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-10">
            <h1 className="text-4xl font-bold mb-4">Bienvenue dans votre Jumeau Numérique</h1>
            <p className="text-xl text-purple-300">Session sécurisée active. Vos données sont chiffrées.</p>
            {/* Ici viendra le composant Scribe plus tard */}
        </div>
    );
}
