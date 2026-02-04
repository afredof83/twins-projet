'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { base64ToArray, verifyPassword } from '@/lib/crypto/zk-encryption';
import { keyManager } from '@/lib/crypto/key-manager';

function UnlockContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [profileData, setProfileData] = useState<any>(null);

    useEffect(() => {
        if (id) {
            fetch(`/api/profile/${id}`).then(res => res.json()).then(setProfileData);
        }
    }, [id]);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!profileData) throw new Error("Profil non chargé");

            const salt = base64ToArray(profileData.saltBase64);
            const isValid = verifyPassword(password, salt, profileData.passwordHash);

            if (!isValid) throw new Error("Mot de passe incorrect");

            // Initialiser la session sécurisée en mémoire
            await keyManager.initializeSession(profileData.id, password, salt);
            router.push('/dashboard'); // Redirection vers le tableau de bord
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!profileData) return <div className="text-white text-center mt-20">Chargement du profil...</div>;

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20">
                <h1 className="text-2xl font-bold text-white mb-2 text-center">Déverrouiller {profileData.name}</h1>
                {error && <div className="bg-red-500/20 text-red-200 p-3 rounded mb-4">{error}</div>}
                <form onSubmit={handleUnlock} className="space-y-4">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/20 border border-purple-500/30 rounded p-3 text-white"
                        placeholder="Mot de passe maître"
                        autoFocus
                    />
                    <button disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded transition">
                        {loading ? 'Déchiffrement...' : 'Accéder au Jumeau'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function UnlockPage() {
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <UnlockContent />
        </Suspense>
    );
}
