'use client'
import { useState, useEffect } from 'react';
import { updateProfile } from '@/app/actions/profile';

// Mock pour satisfaire le lintersi nécessaire, ou on utilise l'ID en dur comme demandé par l'utilisateur
// Mais pour être propre, on va utiliser l'ID en dur + une fausse auth si le client supabase n'est pas prêt

export default function ProfilePage() {
    // ID Hardcodé comme demandé explicitement
    const userId = "710fc2a1-f078-409d-8f82-faa7e4f99951";

    const [status, setStatus] = useState('');
    const [profile, setProfile] = useState({
        age: 30, // Valeur par défaut
        gender: 'M',
        profession: '',
        hobbies: '',
        objectives: [] as string[]
    });

    const handleSave = async () => {
        setStatus('SYNCHRONISATION...');
        // Transformation de string "a, b, c" en array ["a", "b", "c"]
        const hobbiesArray = profile.hobbies.split(',').map(h => h.trim()).filter(h => h);

        const res = await updateProfile(userId, {
            ...profile,
            hobbies: hobbiesArray
        });

        if (res.success) {
            setStatus('PROFIL MIS À JOUR.');
        } else {
            setStatus('ERREUR DE SYNCHRONISATION.');
        }
    };

    const toggleObjective = (obj: string) => {
        setProfile(prev => {
            const exists = prev.objectives.includes(obj);
            if (exists) return { ...prev, objectives: prev.objectives.filter(o => o !== obj) };
            return { ...prev, objectives: [...prev.objectives, obj] };
        });
    };

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-8 border-x border-green-900 max-w-4xl mx-auto">
            <h1 className="text-2xl mb-8 border-b border-green-900 pb-2 uppercase tracking-tighter text-green-300">
                👤 Configuration de l'Entité Clone
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs text-green-800 mb-1">ÂGE</label>
                        <input
                            type="number"
                            value={profile.age}
                            onChange={e => setProfile({ ...profile, age: parseInt(e.target.value) || 0 })}
                            className="bg-black border border-green-900 p-2 w-full focus:border-green-400 outline-none text-green-400"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-green-800 mb-1">SEXE / GENRE</label>
                        <select
                            value={profile.gender}
                            onChange={e => setProfile({ ...profile, gender: e.target.value })}
                            className="bg-black border border-green-900 p-2 w-full outline-none text-green-400"
                        >
                            <option value="M">Masculin</option>
                            <option value="F">Féminin</option>
                            <option value="X">Non-binaire</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-green-800 mb-1">PROFESSION / SECTEUR</label>
                        <input
                            type="text"
                            value={profile.profession}
                            onChange={e => setProfile({ ...profile, profession: e.target.value })}
                            placeholder="ex: Architecte, Codeur, Freelance..."
                            className="bg-black border border-green-900 p-2 w-full outline-none text-green-400 placeholder:text-green-900/50"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-green-800 mb-1">HOBBIES (séparés par des virgules)</label>
                        <textarea
                            value={profile.hobbies}
                            onChange={e => setProfile({ ...profile, hobbies: e.target.value })}
                            className="bg-black border border-green-900 p-2 w-full h-24 outline-none text-green-400 custom-scrollbar"
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <label className="block text-xs text-green-800 mb-4">THÉMATIQUES RECHERCHÉES</label>
                    {['Travail', 'Rencontres', 'Networking', 'Loisirs', 'Projets Open Source'].map(obj => (
                        <label key={obj} className="flex items-center gap-3 cursor-pointer p-2 border border-green-900/30 hover:bg-green-900/10 transition-all select-none">
                            <div className={`w-4 h-4 border border-green-600 flex items-center justify-center ${profile.objectives.includes(obj) ? 'bg-green-600' : ''}`}>
                                {profile.objectives.includes(obj) && <span className="text-black text-xs font-bold">X</span>}
                            </div>
                            <input
                                type="checkbox"
                                checked={profile.objectives.includes(obj)}
                                onChange={() => toggleObjective(obj)}
                                className="hidden"
                            />
                            <span className={`text-sm uppercase ${profile.objectives.includes(obj) ? 'text-green-400 font-bold' : 'text-green-700'}`}>{obj}</span>
                        </label>
                    ))}

                    <button
                        onClick={handleSave}
                        className="w-full bg-green-900/20 border border-green-500 py-4 mt-8 hover:bg-green-500 hover:text-black font-bold transition-all uppercase tracking-widest relative overflow-hidden group"
                    >
                        {status || 'SAUVEGARDER L\'IDENTITÉ'}
                        <div className="absolute inset-0 bg-green-400/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 w-full transform skew-x-12"></div>
                    </button>
                </div>
            </div>
        </div>
    );
}
