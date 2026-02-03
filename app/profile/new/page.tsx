'use client';

/**
 * New Profile Creation Page
 * Allows users to create a new digital twin profile with Zero-Knowledge encryption
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateMnemonic } from 'bip39';
import {
    generateSalt,
    hashPassword,
    deriveKey,
    encryptObject,
    arrayToBase64,
} from '@/lib/crypto/zk-encryption';

export default function NewProfilePage() {
    const router = useRouter();
    const [step, setStep] = useState<'form' | 'recovery'>('form');
    const [formData, setFormData] = useState({
        name: '',
        masterPassword: '',
        confirmPassword: '',
    });
    const [recoveryPhrase, setRecoveryPhrase] = useState<string>('');
    const [profileId, setProfileId] = useState<string>('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string>('');
    const [phraseConfirmed, setPhraseConfirmed] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (formData.name.length < 2) {
            setError('Le nom doit contenir au moins 2 caractères');
            return;
        }

        if (formData.masterPassword.length < 12) {
            setError('Le mot de passe maître doit contenir au moins 12 caractères');
            return;
        }

        if (formData.masterPassword !== formData.confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }

        setIsCreating(true);

        try {
            // ===== CLIENT-SIDE CRYPTOGRAPHY (Zero-Knowledge) =====

            // 1. Generate cryptographic salt
            const salt = generateSalt();
            const saltBase64 = arrayToBase64(salt);

            // 2. Generate BIP39 recovery phrase (12 words)
            const generatedRecoveryPhrase = generateMnemonic(128); // 128 bits = 12 words

            // 3. Hash the password for verification (not for encryption!)
            const passwordHash = hashPassword(formData.masterPassword, salt);

            // 4. Generate unique vector namespace for this profile
            const vectorNamespace = `profile_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // 5. Derive master key from password
            const masterKey = await deriveKey(formData.masterPassword, salt);

            // 6. Create and encrypt initial metadata
            const metadata = {
                preferences: {},
                settings: {},
                createdBy: 'digital-twin-profile-system',
                version: '1.0.0',
            };
            const encryptedMetadata = await encryptObject(metadata, masterKey);

            // 7. Encrypt recovery phrase
            const encryptedPhrase = await encryptObject(
                { phrase: generatedRecoveryPhrase },
                masterKey
            );

            // ===== SEND ONLY ENCRYPTED DATA TO SERVER =====
            const response = await fetch('/api/profile/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    passwordHash,
                    saltBase64,
                    encryptedMetadata,
                    encryptedPhrase,
                    vectorNamespace,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Échec de la création du profil');
            }

            const data = await response.json();

            // Store recovery phrase (generated client-side, never sent to server)
            setRecoveryPhrase(generatedRecoveryPhrase);
            setProfileId(data.profileId);
            setStep('recovery');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopyPhrase = () => {
        navigator.clipboard.writeText(recoveryPhrase);
        alert('Phrase de récupération copiée dans le presse-papiers');
    };

    const handleConfirmAndContinue = () => {
        if (!phraseConfirmed) {
            alert('Veuillez confirmer que vous avez sauvegardé votre phrase de récupération');
            return;
        }
        router.push(`/profile/unlock?id=${profileId}`);
    };

    if (step === 'recovery') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Profil Créé avec Succès !</h1>
                        <p className="text-purple-200">Votre jumeau numérique est maintenant initialisé</p>
                    </div>

                    <div className="bg-red-500/20 border border-red-400 rounded-lg p-6 mb-6">
                        <div className="flex items-start gap-3">
                            <svg className="w-6 h-6 text-red-300 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                                <h3 className="text-red-200 font-bold mb-2">⚠️ CRITIQUE : Sauvegardez Votre Phrase de Récupération</h3>
                                <p className="text-red-100 text-sm">
                                    Cette phrase de 12 mots est la SEULE façon de récupérer votre profil si vous oubliez votre mot de passe.
                                    <strong className="block mt-2">Perte de cette phrase = Perte IRRÉVERSIBLE de toutes vos données.</strong>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white font-semibold">Phrase de Récupération BIP39</h3>
                            <button
                                onClick={handleCopyPhrase}
                                className="text-purple-300 hover:text-purple-200 text-sm flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copier
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {recoveryPhrase.split(' ').map((word, index) => (
                                <div key={index} className="bg-slate-700/50 rounded px-3 py-2 text-center">
                                    <span className="text-purple-300 text-xs">{index + 1}.</span>
                                    <span className="text-white font-mono ml-2">{word}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={phraseConfirmed}
                                onChange={(e) => setPhraseConfirmed(e.target.checked)}
                                className="w-5 h-5 rounded border-purple-400 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-white text-sm">
                                J'ai sauvegardé ma phrase de récupération en lieu sûr et je comprends qu'elle ne peut pas être récupérée
                            </span>
                        </label>
                    </div>

                    <button
                        onClick={handleConfirmAndContinue}
                        disabled={!phraseConfirmed}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Continuer vers le Profil
                    </button>

                    <p className="text-purple-200 text-xs text-center mt-4">
                        ID du Profil : <span className="font-mono">{profileId}</span>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Nouveau Jumeau Numérique</h1>
                    <p className="text-purple-200">Créez votre profil sécurisé avec chiffrement Zero-Knowledge</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-400 rounded-lg p-3 mb-4">
                        <p className="text-red-200 text-sm">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-purple-200 text-sm font-medium mb-2">
                            Nom du Profil
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-white/5 border border-purple-300/30 rounded-lg px-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Ex: Mon Jumeau Personnel"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-purple-200 text-sm font-medium mb-2">
                            Mot de Passe Maître (min. 12 caractères)
                        </label>
                        <input
                            type="password"
                            value={formData.masterPassword}
                            onChange={(e) => setFormData({ ...formData, masterPassword: e.target.value })}
                            className="w-full bg-white/5 border border-purple-300/30 rounded-lg px-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="••••••••••••"
                            minLength={12}
                            required
                        />
                        <p className="text-purple-300/70 text-xs mt-1">
                            Ce mot de passe ne sera JAMAIS stocké sur le serveur
                        </p>
                    </div>

                    <div>
                        <label className="block text-purple-200 text-sm font-medium mb-2">
                            Confirmer le Mot de Passe
                        </label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="w-full bg-white/5 border border-purple-300/30 rounded-lg px-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="••••••••••••"
                            minLength={12}
                            required
                        />
                    </div>

                    <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-4">
                        <h3 className="text-blue-200 font-semibold text-sm mb-2">🔐 Sécurité Zero-Knowledge</h3>
                        <ul className="text-blue-100 text-xs space-y-1">
                            <li>✓ Chiffrement AES-256-GCM côté client</li>
                            <li>✓ Vos clés ne quittent jamais votre appareil</li>
                            <li>✓ Le serveur ne peut pas lire vos données</li>
                            <li>✓ Phrase de récupération BIP39 (12 mots)</li>
                        </ul>
                    </div>

                    <button
                        type="submit"
                        disabled={isCreating}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isCreating ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Création en cours...
                            </>
                        ) : (
                            'Créer le Profil'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <a href="/" className="text-purple-300 hover:text-purple-200 text-sm">
                        ← Retour à l'accueil
                    </a>
                </div>
            </div>
        </div>
    );
}
