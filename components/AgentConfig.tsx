'use client'

import { useState } from 'react'
import { Briefcase, Heart, Palmtree, Globe, Save } from 'lucide-react'

// Définition de nos questions pour les menus déroulants
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
    const [activeTab, setActiveTab] = useState('travail');
    const [country, setCountry] = useState(initialData?.country || '');
    const [formData, setFormData] = useState<any>(initialData?.thematicProfile || {});

    // Gère la sélection dans le menu déroulant ET le champ texte manuel
    const handleChange = (tab: string, questionId: string, value: string) => {
        setFormData((prev: any) => ({
            ...prev,
            [tab]: {
                ...prev[tab],
                [questionId]: value
            }
        }));
    };

    const handleSave = async () => {
        console.log("💾 Sauvegarde de la matrice :", { country, thematicProfile: formData });

        // 🟢 NOUVEAU : On envoie les données à l'API !
        try {
            const res = await fetch('/api/agent/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileId, country, thematicProfile: formData })
            });
            const data = await res.json();

            if (data.success) {
                alert("Agent IA configuré avec succès !"); // Ou une jolie notification
            } else {
                alert("Erreur lors de la sauvegarde.");
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="bg-gray-900 text-white p-6 rounded-lg border border-gray-700 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-blue-400">CONFIGURATION DE L'AGENT IA</h2>

                {/* PARAMÈTRE GÉOGRAPHIQUE GLOBAL */}
                <div className="flex items-center space-x-2 bg-gray-800 p-2 rounded">
                    <Globe size={18} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Pays de l'Agent..."
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="bg-transparent text-sm focus:outline-none w-32"
                    />
                </div>
            </div>

            {/* LES ONGLETS (Préparation au Paywall) */}
            <div className="flex space-x-2 mb-6">
                <button onClick={() => setActiveTab('travail')} className={`flex items-center px-4 py-2 rounded-t-lg transition ${activeTab === 'travail' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
                    <Briefcase size={16} className="mr-2" /> Travail
                </button>
                <button onClick={() => setActiveTab('rencontre')} className={`flex items-center px-4 py-2 rounded-t-lg transition ${activeTab === 'rencontre' ? 'bg-pink-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
                    <Heart size={16} className="mr-2" /> Rencontre
                </button>
                <button onClick={() => setActiveTab('loisirs')} className={`flex items-center px-4 py-2 rounded-t-lg transition ${activeTab === 'loisirs' ? 'bg-green-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
                    <Palmtree size={16} className="mr-2" /> Loisirs
                </button>
            </div>

            {/* LE FORMULAIRE DYNAMIQUE DE L'ONGLET ACTIF */}
            <div className="space-y-4 bg-gray-800 p-4 rounded-b-lg rounded-tr-lg border border-gray-700">
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
                                    if (e.target.value === 'Autre (préciser)') {
                                        handleChange(activeTab, q.id, 'CUSTOM:');
                                    } else {
                                        handleChange(activeTab, q.id, e.target.value);
                                    }
                                }}
                                className="bg-gray-900 border border-gray-600 rounded p-2 text-sm focus:border-blue-500"
                            >
                                <option value="" disabled>Sélectionner...</option>
                                {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>

                            {/* LE CHAMP MANUEL SI "AUTRE" EST SÉLECTIONNÉ */}
                            {isCustom && (
                                <input
                                    type="text"
                                    placeholder="Précisez votre choix..."
                                    value={currentValue.replace('CUSTOM:', '')}
                                    onChange={(e) => handleChange(activeTab, q.id, `CUSTOM:${e.target.value}`)}
                                    className="bg-gray-700 border border-gray-500 rounded p-2 text-sm mt-2 focus:border-blue-500"
                                    autoFocus
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <button onClick={handleSave} className="mt-6 w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold transition shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                <Save className="mr-2" size={20} /> ENREGISTRER L'ADN DE L'AGENT
            </button>
        </div>
    );
}
