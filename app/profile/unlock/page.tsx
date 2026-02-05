'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { base64ToArray, verifyPassword } from '@/lib/crypto/zk-encryption';
import { keyManager } from '@/lib/crypto/key-manager';

function UnlockContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlId = searchParams.get('id');

    const [step, setStep] = useState<'ID_INPUT' | 'PASSWORD_INPUT'>(urlId ? 'PASSWORD_INPUT' : 'ID_INPUT');
    const [manualId, setManualId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [profileData, setProfileData] = useState<any>(null);

    // The active profile ID (either from URL or manual input)
    const activeId = urlId || manualId;

    useEffect(() => {
        if (activeId) {
            fetch(`/api/profile/${activeId}`)
                .then(res => {
                    if (!res.ok) throw new Error('Profil introuvable');
                    return res.json();
                })
                .then(setProfileData)
                .catch(err => setError(err.message));
        }
    }, [activeId]);

    const handleIdSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!manualId.trim()) {
            setError('Veuillez entrer un ID de profil');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/profile/${manualId}`);
            if (!res.ok) throw new Error('Profil introuvable');
            const data = await res.json();
            setProfileData(data);
            setStep('PASSWORD_INPUT');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
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

            // Save to localStorage for future quick access
            localStorage.setItem('twins_last_id', profileData.id);
            localStorage.setItem('twins_last_name', profileData.name);

            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 1: ID Input
    if (step === 'ID_INPUT') {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20">
                    <h1 className="text-2xl font-bold text-white mb-2 text-center">Connexion Manuelle</h1>
                    <p className="text-purple-300 text-sm text-center mb-6">Entrez votre ID de profil</p>

                    {error && <div className="bg-red-500/20 text-red-200 p-3 rounded mb-4">{error}</div>}

                    <form onSubmit={handleIdSubmit} className="space-y-4">
                        <input
                            type="text"
                            value={manualId}
                            onChange={(e) => setManualId(e.target.value)}
                            className="w-full bg-black/20 border border-purple-500/30 rounded p-3 text-white font-mono text-sm"
                            placeholder="clxxx..."
                            autoFocus
                        />
                        <button
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded transition"
                        >
                            {loading ? 'Vérification...' : 'Continuer'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Step 2: Password Input
    if (!profileData) {
        return <div className="text-white text-center mt-20">Chargement du profil...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20">
                <h1 className="text-2xl font-bold text-white mb-2 text-center">Déverrouiller {profileData.name}</h1>
                <p className="text-purple-300 text-xs text-center mb-6 font-mono">ID: {profileData.id.slice(0, 12)}...</p>

                {error && <div className="bg-red-500/20 text-red-200 p-3 rounded mb-4">{error}</div>}

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/20 border border-purple-500/30 rounded p-3 text-white"
                        placeholder="Mot de passe maître"
                        autoFocus
                    />
                    <button
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded transition"
                    >
                        {loading ? 'Déchiffrement...' : 'Accéder au Jumeau'}
                    </button>

                    {!urlId && (
                        <button
                            type="button"
                            onClick={() => {
                                setStep('ID_INPUT');
                                setPassword('');
                                setError('');
                            }}
                            className="w-full text-purple-300 hover:text-white text-sm transition"
                        >
                            ← Retour
                        </button>
                    )}
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
