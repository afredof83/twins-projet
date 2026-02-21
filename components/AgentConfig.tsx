'use client'

import { useState } from 'react'
import { Briefcase, Heart, Palmtree, Save, User, Globe, Hash } from 'lucide-react'

const QUESTIONS = {
    travail: [
        { id: 'secteur', label: 'Secteur d\'activité', options: ['Technologie', 'Commerce', 'Artisanat', 'Santé', 'Autre (préciser)'] },
        { id: 'rythme', label: 'Rythme de travail', options: ['Acharné (Start-up)', 'Équilibré (9h-17h)', 'Flexible (Freelance)', 'Autre (préciser)'] }
    ],
    rencontre: [
        { id: 'objectif', label: 'Recherche principale', options: ['Sérieux', 'Amical', 'Éphémère', 'Réseautage', 'Autre (préciser)'] },
        { id: 'caractere', label: 'Trait dominant', options: ['Extraverti', 'Mystérieux', 'Protecteur', 'Humoristique', 'Autre (préciser)'] }
    ],
    loisirs: [
        { id: 'passion', label: 'Activité favorite', options: ['Sport extrême', 'Jeux vidéo', 'Lecture/Culture', 'Voyages', 'Autre (préciser)'] },
        { id: 'weekend', label: 'Week-end idéal', options: ['Fête jusqu\'à l\'aube', 'Chill Netflix', 'Randonnée nature', 'Autre (préciser)'] }
    ]
};

export default function AgentConfig({ profileId, initialData }: { profileId: string, initialData?: any }) {
    // ÉTATS MODULE 1 (Général)
    const [age, setAge] = useState<string | number>(initialData?.age || '');
    const [gender, setGender] = useState(initialData?.gender || '');
    const [country, setCountry] = useState(initialData?.country || '');

    // ÉTATS MODULE 2 (Thématique)
    const [activeTab, setActiveTab] = useState('travail');
    const [formData, setFormData] = useState<any>(initialData?.thematicProfile || {});

    const handleThematicChange = (tab: string, questionId: string, value: string) => {
        setFormData((prev: any) => ({
            ...prev,
            [tab]: { ...prev[tab], [questionId]: value }
        }));
    };

    const handleSave = async () => {
        try {
            const res = await fetch('/api/agent/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileId, country, age, gender, thematicProfile: formData })
            });
            const data = await res.json();
            if (data.success) alert("ADN de l'Agent sauvegardé avec succès !");
            else alert("Erreur lors de la sauvegarde.");
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="max-w-3xl w-full mx-auto space-y-6">

            {/* 🟦 MODULE 1 : IDENTITÉ GÉNÉRALE */}
            <div className="bg-gray-900 text-white p-6 rounded-lg border border-gray-700 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center border-b border-gray-700 pb-2">
                    <User className="mr-2 text-blue-400" /> IDENTITÉ GÉNÉRALE
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-semibold text-gray-400 flex items-center"><Hash size={14} className="mr-1" /> Âge</label>
                        <input type="number" min="18" max="120" value={age} onChange={(e) => setAge(e.target.value)} className="bg-gray-800 border border-gray-600 rounded p-2 text-sm focus:border-blue-500 outline-none" placeholder="Ex: 35" />
                    </div>

                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-semibold text-gray-400 flex items-center"><User size={14} className="mr-1" /> Genre</label>
                        <select value={gender} onChange={(e) => setGender(e.target.value)} className="bg-gray-800 border border-gray-600 rounded p-2 text-sm focus:border-blue-500 outline-none">
                            <option value="">Sélectionner...</option>
                            <option value="Homme">Homme</option>
                            <option value="Femme">Femme</option>
                            <option value="Non-binaire">Non-binaire</option>
                            <option value="Autre">Autre</option>
                        </select>
                    </div>

                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-semibold text-gray-400 flex items-center"><Globe size={14} className="mr-1" /> Pays (Langue)</label>
                        <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="bg-gray-800 border border-gray-600 rounded p-2 text-sm focus:border-blue-500 outline-none" placeholder="Ex: France, Japon..." />
                    </div>
                </div>
            </div>

            {/* 🟪 MODULE 2 : MATRICE THÉMATIQUE */}
            <div className="bg-gray-900 text-white p-6 rounded-lg border border-purple-900/50 shadow-lg relative overflow-hidden">
                {/* Petit badge "PREMIUM" pour préparer visuellement l'arrivée de Stripe */}
                <div className="absolute top-0 right-0 bg-purple-600 text-xs font-bold px-3 py-1 rounded-bl-lg">MODULE AVANCÉ</div>

                <h2 className="text-xl font-bold text-white mb-4 flex items-center border-b border-gray-700 pb-2">
                    <Briefcase className="mr-2 text-purple-400" /> MATRICE PSYCHOLOGIQUE
                </h2>

                <div className="flex space-x-2 mb-4 overflow-x-auto">
                    <button onClick={() => setActiveTab('travail')} className={`flex items-center px-4 py-2 rounded transition whitespace-nowrap ${activeTab === 'travail' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
                        <Briefcase size={16} className="mr-2" /> Travail
                    </button>
                    <button onClick={() => setActiveTab('rencontre')} className={`flex items-center px-4 py-2 rounded transition whitespace-nowrap ${activeTab === 'rencontre' ? 'bg-pink-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
                        <Heart size={16} className="mr-2" /> Rencontre
                    </button>
                    <button onClick={() => setActiveTab('loisirs')} className={`flex items-center px-4 py-2 rounded transition whitespace-nowrap ${activeTab === 'loisirs' ? 'bg-green-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
                        <Palmtree size={16} className="mr-2" /> Loisirs
                    </button>
                </div>

                <div className="space-y-4 bg-gray-800 p-4 rounded border border-gray-700">
                    {QUESTIONS[activeTab as keyof typeof QUESTIONS].map((q) => {
                        const currentValue = formData[activeTab]?.[q.id] || '';
                        const isCustom = currentValue.startsWith('CUSTOM:');
                        const displayValue = isCustom ? 'Autre (préciser)' : currentValue;

                        return (
                            <div key={q.id} className="flex flex-col space-y-2">
                                <label className="text-sm font-semibold text-gray-300">{q.label}</label>
                                <select
                                    value={displayValue}
                                    onChange={(e) => {
                                        if (e.target.value === 'Autre (préciser)') handleThematicChange(activeTab, q.id, 'CUSTOM:');
                                        else handleThematicChange(activeTab, q.id, e.target.value);
                                    }}
                                    className="bg-gray-900 border border-gray-600 rounded p-2 text-sm focus:border-purple-500 outline-none"
                                >
                                    <option value="" disabled>Sélectionner...</option>
                                    {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>

                                {isCustom && (
                                    <input
                                        type="text"
                                        placeholder="Précisez votre choix..."
                                        value={currentValue.replace('CUSTOM:', '')}
                                        onChange={(e) => handleThematicChange(activeTab, q.id, `CUSTOM:${e.target.value}`)}
                                        className="bg-gray-700 border border-gray-500 rounded p-2 text-sm mt-2 focus:border-purple-500 outline-none"
                                        autoFocus
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* BOUTON GLOBAL DE SAUVEGARDE */}
            <button onClick={handleSave} className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 py-4 rounded-lg font-bold transition shadow-[0_0_15px_rgba(37,99,235,0.4)] text-lg">
                <Save className="mr-2" size={24} /> SAUVEGARDER L'ADN DE L'AGENT
            </button>
        </div>
    );
}
