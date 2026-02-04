'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { keyManager } from '@/lib/crypto/key-manager';
import { encrypt, decrypt } from '@/lib/crypto/zk-encryption';

interface Memory {
    id: string;
    encryptedContent: string;
    encryptedMetadata: string;
    type: string;
    createdAt: string;
    updatedAt: string;
}

interface DecryptedMemory extends Memory {
    content: string;
}

export default function Dashboard() {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [memories, setMemories] = useState<DecryptedMemory[]>([]);
    const [newMemory, setNewMemory] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!keyManager.isSessionActive()) {
            router.push('/');
        } else {
            setAuthorized(true);
            loadMemories();
        }
    }, [router]);

    const loadMemories = async () => {
        setLoading(true);
        setError('');
        try {
            const profileId = keyManager.getProfileId();
            const response = await fetch(`/api/memory?profileId=${profileId}`);

            if (!response.ok) {
                throw new Error('Failed to load memories');
            }

            const data = await response.json();
            const masterKey = keyManager.getMasterKey();

            // Decrypt all memories client-side
            const decryptedMemories = await Promise.all(
                data.memories.map(async (memory: Memory) => {
                    try {
                        const content = await decrypt(memory.encryptedContent, masterKey);
                        return { ...memory, content };
                    } catch (err) {
                        console.error('Failed to decrypt memory:', memory.id, err);
                        return { ...memory, content: '[Erreur de déchiffrement]' };
                    }
                })
            );

            setMemories(decryptedMemories);
        } catch (err: any) {
            setError(err.message);
            console.error('Error loading memories:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMemory = async () => {
        if (!newMemory.trim()) {
            setError('Veuillez entrer un souvenir');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const profileId = keyManager.getProfileId();
            const masterKey = keyManager.getMasterKey();

            // Encrypt content client-side
            const encryptedContent = await encrypt(newMemory, masterKey);
            const encryptedMetadata = await encrypt(
                JSON.stringify({ timestamp: new Date().toISOString() }),
                masterKey
            );

            // Send encrypted data to server
            const response = await fetch('/api/memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profileId,
                    encryptedContent,
                    encryptedMetadata,
                    type: 'TEXT',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save memory');
            }

            // Clear input and reload memories
            setNewMemory('');
            await loadMemories();
        } catch (err: any) {
            setError(err.message);
            console.error('Error saving memory:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleSaveMemory();
        }
    };

    if (!authorized) return null;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        Scribe - Mémoire Chiffrée
                    </h1>
                    <p className="text-purple-300">
                        🔐 Session sécurisée • Chiffrement Zero-Knowledge actif
                    </p>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-500/20 border border-red-400 rounded-lg p-3 mb-6">
                        <p className="text-red-200">{error}</p>
                    </div>
                )}

                {/* Memory Input */}
                <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-8 border border-purple-500/30">
                    <h2 className="text-xl font-semibold mb-4 text-purple-300">
                        ✍️ Nouveau Souvenir
                    </h2>
                    <textarea
                        value={newMemory}
                        onChange={(e) => setNewMemory(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="w-full bg-slate-900/50 border border-purple-500/30 rounded-lg p-4 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px] resize-y"
                        placeholder="Écrivez votre souvenir ici... (Ctrl+Enter pour sauvegarder)"
                    />
                    <div className="flex justify-between items-center mt-4">
                        <p className="text-sm text-purple-300/70">
                            Chiffré localement avant envoi
                        </p>
                        <button
                            onClick={handleSaveMemory}
                            disabled={saving || !newMemory.trim()}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold px-6 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Chiffrement...
                                </>
                            ) : (
                                '💾 Mémoriser'
                            )}
                        </button>
                    </div>
                </div>

                {/* Memories List */}
                <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-purple-500/30">
                    <h2 className="text-xl font-semibold mb-4 text-purple-300">
                        📚 Souvenirs Enregistrés ({memories.length})
                    </h2>

                    {loading ? (
                        <div className="text-center py-8">
                            <svg className="animate-spin h-8 w-8 mx-auto text-purple-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <p className="text-purple-300 mt-2">Déchiffrement des souvenirs...</p>
                        </div>
                    ) : memories.length === 0 ? (
                        <div className="text-center py-8 text-purple-300/70">
                            <p>Aucun souvenir enregistré pour le moment.</p>
                            <p className="text-sm mt-2">Commencez à écrire ci-dessus ✨</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {memories.map((memory) => (
                                <div
                                    key={memory.id}
                                    className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/20 hover:border-purple-500/40 transition-colors"
                                >
                                    <p className="text-white whitespace-pre-wrap mb-2">
                                        {memory.content}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-purple-300/70">
                                        <span>🕐 {new Date(memory.createdAt).toLocaleString('fr-FR')}</span>
                                        <span>🔐 Chiffré</span>
                                        <span className="ml-auto font-mono text-purple-400/50">
                                            {memory.id.slice(0, 8)}...
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Session Info */}
                <div className="mt-6 text-center text-sm text-purple-300/50">
                    <p>
                        🔒 Toutes les données sont chiffrées avec AES-256-GCM
                    </p>
                </div>
            </div>
        </div>
    );
}
