"use client";

import { useState, useEffect } from 'react';

export default function ProfilePage() {
    const [profile, setProfile] = useState({
        name: '',
        city: '',
        industry: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Au chargement, on va chercher tes infos dans la base de données
    useEffect(() => {
        fetch('/api/profile')
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    setProfile({
                        name: data.name || '',
                        city: data.city || '',
                        industry: data.industry || ''
                    });
                }
            });
    }, []);

    // Quand on clique sur Sauvegarder
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage('');

        const response = await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile)
        });

        const result = await response.json();
        if (result.success) {
            setMessage('✅ Identité mise à jour avec succès !');
        } else {
            setMessage('❌ Erreur lors de la sauvegarde.');
        }
        setIsSaving(false);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-md mx-auto">
                <h1 className="text-3xl font-bold mb-2">Mon Identité</h1>
                <p className="text-gray-400 mb-8">Ce profil sert de boussole à ton Agent IA.</p>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Champ Nom */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Nom / Pseudo</label>
                        <input
                            type="text"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={profile.name || ''}
                            onChange={e => setProfile({ ...profile, name: e.target.value })}
                        />
                    </div>

                    {/* Champ Localisation */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Localisation de recherche</label>
                        <input
                            type="text"
                            placeholder="ex: Toulon, 83"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={profile.city || ''}
                            onChange={e => setProfile({ ...profile, city: e.target.value })}
                        />
                    </div>

                    {/* Champ Secteur */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Secteur cible</label>
                        <input
                            type="text"
                            placeholder="ex: Logistique, Tech..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={profile.industry || ''}
                            onChange={e => setProfile({ ...profile, industry: e.target.value })}
                        />
                    </div>

                    {/* Bouton de sauvegarde */}
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-4"
                    >
                        {isSaving ? 'Synchronisation...' : 'Mettre à jour mon Agent'}
                    </button>

                    {/* Message de succès */}
                    {message && (
                        <div className={`p-4 rounded-lg text-center ${message.includes('✅') ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                            {message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
