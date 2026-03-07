'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { performBiometricVaultUnlock } from '@/lib/biometrics';
import { useKeyStore } from '@/store/keyStore';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

export default function UnlockPage() {
    const router = useRouter();
    const setMasterKey = useKeyStore((state) => state.setMasterKey);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleUnlock = async () => {
        setLoading(true);
        setError('');

        try {
            // 1. Déclenchement du scan natif
            const isVerified = await performBiometricVaultUnlock();

            if (isVerified) {
                // 2. Récupération de la clé depuis l'enclave sécurisée (Hardware)
                const { value: encryptedKey } = await SecureStoragePlugin.get({ key: 'master_key_secret' });

                if (encryptedKey) {
                    // 3. Injection dans la RAM pour SQLite (Phase 2 & 4)
                    setMasterKey(encryptedKey);
                    router.push('/cortex');
                } else {
                    setError("Clé de coffre-fort introuvable sur cet appareil.");
                }
            } else {
                setError("Accès refusé. Identité non reconnue.");
            }
        } catch (err: any) {
            setError(err.message || "Erreur technique lors du déverrouillage.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20 text-center">
                <div className="w-20 h-20 bg-blue-600/20 rounded-full mx-auto mb-6 flex items-center justify-center border border-blue-500/30">
                    <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Bunker Verrouillé</h1>
                <p className="text-blue-200 text-sm mb-8">Authentification biométrique requise pour dévouer votre clé de chiffrement.</p>

                {error && <div className="bg-red-500/20 text-red-200 p-3 rounded mb-6 text-sm">{error}</div>}

                <button
                    onClick={handleUnlock}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/40 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                        <>
                            <span className="animate-pulse">🔓</span>
                            Déverrouiller par Biométrie
                        </>
                    )}
                </button>

                <div className="mt-8 text-slate-500 text-xs uppercase tracking-widest font-bold">
                    Hardware Protected Storage
                </div>
            </div>
        </div>
    );
}
