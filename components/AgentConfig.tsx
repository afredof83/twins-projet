'use client'

import { useState, useEffect } from 'react'
import { Briefcase, Heart, Palmtree, Save, User, Globe, Hash, MapPin, Calendar, Zap, Target, Edit3, RefreshCw } from 'lucide-react'
import { getApiUrl } from '@/lib/api-config';
// Server actions supprimées — on utilise fetch vers /api/agent

const QUESTIONS = {
    travail: [
        { id: 'industry', label: 'Secteur d\'activité', options: ['Tech & Data', 'Commerce & Vente', 'Marketing & Design', 'Finance & Crypto', 'Santé & Bien-être', 'Artisanat & BTP', 'Autre (préciser)'] },
        { id: 'professionalStatus', label: 'Statut Professionnel', options: ['Salarié', 'Freelance / Indépendant', 'Entrepreneur / CEO', 'En transition / Recherche', 'Étudiant'] },
        { id: 'seniority', label: 'Niveau d\'expérience', options: ['Junior (0-2 ans)', 'Confirmé (3-5 ans)', 'Senior (6-10 ans)', 'Expert (+10 ans)'] },
        { id: 'objectives', label: 'Objectif Prioritaire', options: ['Acquisition de clients (B2B/B2C)', 'Nouvelle opportunité de poste', 'Recherche de partenaires/fonds', 'Veille technologique/marché', 'Reconversion professionnelle'] },
        { id: 'environment', label: 'Environnement idéal', options: ['Start-up / Scale-up', 'Grand Groupe Entreprise', 'PME / TPE', '100% Télétravail / Nomad'] }
    ],


    // 🟢 NOUVEAU BLOC : LA BOUSSOLE MORALE
    ikigai: [
        { id: 'ikigaiMission', label: 'Mission de vie (Aspiration profonde)', options: ['Créer de l\'impact (Social/Écolo)', 'Atteindre l\'indépendance absolue (Liberté/Finance)', 'Innover & Construire l\'avenir (Création)', 'Transmettre & Aider (Mentorat/Soin)'] },
        { id: 'ikigaiValues', label: 'Valeurs fondamentales', options: ['Authenticité & Transparence', 'Excellence & Performance', 'Empathie & Bienveillance', 'Audace & Prise de risque'] },
        { id: 'dealbreakers', label: 'Lignes rouges (Ce que l\'IA doit rejeter)', options: ['Micromanagement & Manque d\'autonomie', 'Projets contraires à mon éthique', 'Déséquilibre pro/perso toxique', 'Manque de clarté / Bullshit'] },
        { id: 'superpouvoir', label: 'Votre "Zone de Génie"', options: ['Vision stratégique & Anticipation', 'Exécution & Résolution de problèmes complexes', 'Communication & Fédérer les humains', 'Analyse & Compréhension technique profonde'] },
        { id: 'socialStyle', label: 'Ton de votre Agent Ipse', options: ['Diplomate, Courtois & Chaleureux', 'Froid, Direct & Analytique', 'Mystérieux, Discret & Exclusif', 'Proactif & Agressif (Mode Chasseur)'] }
    ]
};

export default function AgentConfig({ profileId, initialData }: { profileId: string, initialData?: any }) {
    // ÉTATS MODULE 1 (Général)
    const [dateOfBirth, setDateOfBirth] = useState<string>(initialData?.dateOfBirth || '');
    const [gender, setGender] = useState(initialData?.gender || '');
    const [country, setCountry] = useState(initialData?.country || 'France');

    // 🟢 NOUVEAU : Radar Géographique
    const [postalCode, setPostalCode] = useState<string>(initialData?.postalCode || '');
    const [city, setCity] = useState<string>(initialData?.city || '');
    const [citiesList, setCitiesList] = useState<string[]>([]);

    const [synthesis, setSynthesis] = useState<string>(initialData?.unifiedAnalysis || '');
    const [isReflecting, setIsReflecting] = useState(false);

    const handleManualReflect = async () => {
        setIsReflecting(true);
        try {
            const { createClient: createSupabase } = await import('@/lib/supabaseBrowser');
            const supabase = createSupabase();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const data = await fetch(getApiUrl('/api/agent'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'reflect', profileId })
            }).then(r => r.json());
            if (data.success && data.synthesis) {
                setSynthesis(data.synthesis);
                alert("Profilage du Gardien synchronisé avec succès !");
            }
        } catch (e) {
            console.error("Erreur Synchro", e);
        } finally {
            setIsReflecting(false);
        }
    };

    // ÉTATS MODULE 2 (Thématique)
    const [activeTab, setActiveTab] = useState('travail');
    const [formData, setFormData] = useState<any>(initialData?.thematicProfile || {});

    // 🟢 Radar Connecté : API gouv.fr pour les villes
    useEffect(() => {
        if (postalCode.length === 5) {
            fetch(`https://geo.api.gouv.fr/communes?codePostal=${postalCode}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data) && data.length > 0) {
                        const cityNames = data.map((c: any) => c.nom);
                        setCitiesList(cityNames);
                        // Auto-sélectionne la première ville si aucune n'est déjà choisie
                        if (!city || !cityNames.includes(city)) {
                            setCity(cityNames[0]);
                        }
                    } else {
                        setCitiesList([]);
                    }
                })
                .catch(err => console.error("Erreur API Geo", err));
        } else {
            setCitiesList([]);
        }
    }, [postalCode]);

    // Chargement de la mémoire
    useEffect(() => {
        const fetchAgentMemory = async () => {
            if (!profileId) return;
            try {
                const { createClient: createSupabase } = await import('@/lib/supabaseBrowser');
                const supabase = createSupabase();
                const { data: { session } } = await supabase.auth.getSession();
                const headers: any = { 'Content-Type': 'application/json' };
                if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

                const data = await fetch(getApiUrl(`/api/agent?profileId=${profileId}`), { headers }).then(r => r.json());

                if (data.success && data.profile) {
                    const profile = data.profile as any;
                    const thematic = profile.thematicProfile as any;

                    setDateOfBirth(profile.dateOfBirth || '');
                    setPostalCode(profile.postalCode || '');
                    setCity(profile.city || '');
                    setGender(profile.gender || '');
                    setCountry(profile.country || 'France');

                    // ✅ Mappage des top-level fields combinés avec ThematicProfile
                    setFormData({
                        ...thematic,
                        travail: {
                            ...thematic?.travail,
                            industry: profile.industry || thematic?.travail?.industry || '',
                            seniority: profile.seniority || thematic?.travail?.seniority || '',
                            professionalStatus: profile.professionalStatus || thematic?.travail?.professionalStatus || '',
                            environment: profile.environment || thematic?.travail?.environment || '',
                            objectives: profile.objectives?.[0] || thematic?.travail?.objectives || '',
                            precisionsLibres: profile.workNuances || thematic?.travail?.precisionsLibres || ''
                        },
                        ikigai: {
                            ...thematic?.ikigai,
                            ikigaiMission: profile.ikigaiMission || thematic?.ikigai?.ikigaiMission || '',
                            ikigaiValues: profile.ikigaiValues?.[0] || thematic?.ikigai?.ikigaiValues || '',
                            dealbreakers: profile.dealbreakers?.[0] || thematic?.ikigai?.dealbreakers || '',
                            socialStyle: profile.socialStyle || thematic?.ikigai?.socialStyle || ''
                        }
                    });

                    setSynthesis(data.profile.unifiedAnalysis || '');
                }
            } catch (err) {
                console.error("❌ Erreur de restauration :", err);
            }
        };
        fetchAgentMemory();
    }, [profileId]);

    const handleThematicChange = (tab: string, questionId: string, value: string) => {
        setFormData((prev: any) => ({
            ...prev,
            [tab]: { ...prev[tab], [questionId]: value }
        }));
    };

    const handleSave = async () => {
        try {
            const { createClient: createSupabase } = await import('@/lib/supabaseBrowser');
            const supabase = createSupabase();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const data = await fetch(getApiUrl('/api/agent'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'update', profileId, country, dateOfBirth, postalCode, city, gender, thematicProfile: formData })
            }).then(r => r.json());
            if (data.success) alert("ADN de l'Agent Ipse sauvegardé avec succès !");
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* PAYS */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-semibold text-gray-400 flex items-center"><Globe size={14} className="mr-1" /> Pays</label>
                        <select
                            value={country || ""}
                            onChange={(e) => setCountry(e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded p-2 text-sm focus:border-blue-500 outline-none"
                        >
                            <option value="">Sélectionner...</option>
                            <option value="France">France</option>
                            <option value="Suisse">Suisse</option>
                            <option value="Belgique">Belgique</option>
                            <option value="Canada">Canada</option>
                            <option value="Luxembourg">Luxembourg</option>
                        </select>
                    </div>

                    {/* NAISSANCE */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-semibold text-gray-400 flex items-center"><Calendar size={14} className="mr-1" /> Naissance</label>
                        <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="bg-gray-800 border border-gray-600 rounded p-2 text-sm focus:border-blue-500 outline-none" />
                    </div>

                    {/* GENRE */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-semibold text-gray-400 flex items-center"><User size={14} className="mr-1" /> Genre</label>
                        <select value={gender} onChange={(e) => setGender(e.target.value)} className="bg-gray-800 border border-gray-600 rounded p-2 text-sm focus:border-blue-500 outline-none">
                            <option value="">Sélectionner...</option>
                            <option value="Homme">Homme</option>
                            <option value="Femme">Femme</option>
                            <option value="Non-binaire">Non-binaire</option>
                        </select>
                    </div>

                    {/* CODE POSTAL */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-semibold text-gray-400 flex items-center"><MapPin size={14} className="mr-1" /> Code Postal</label>
                        <input type="text" maxLength={5} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="bg-gray-800 border border-gray-600 rounded p-2 text-sm focus:border-blue-500 outline-none" placeholder="Ex: 75001" />
                    </div>

                    {/* VILLE (Générée automatiquement) */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-semibold text-gray-400 flex items-center"><Globe size={14} className="mr-1" /> Ville</label>
                        <select value={city} onChange={(e) => setCity(e.target.value)} disabled={citiesList.length === 0} className="bg-gray-800 border border-gray-600 rounded p-2 text-sm focus:border-blue-500 outline-none disabled:opacity-50">
                            {citiesList.length === 0 ? <option value="">Attente du code...</option> : null}
                            {citiesList.map((c, i) => (
                                <option key={i} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 🟢 LE MODULE DE PROFILAGE DU GARDIEN AVEC BOUTON DE SYNCHRO */}
                <div className="col-span-full mt-6 p-4 bg-gray-900/80 border border-blue-500/40 rounded-lg shadow-inner relative">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 border-b border-gray-700/50 pb-3 gap-3">
                        <div className="flex items-center font-bold text-blue-400">
                            <Zap size={16} className="mr-2 text-blue-500" />
                            PROFILAGE GLOBAL DU GARDIEN (CORTEX)
                        </div>
                        <button
                            onClick={handleManualReflect}
                            disabled={isReflecting}
                            className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-md transition-all shadow disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={`mr-2 ${isReflecting ? 'animate-spin' : ''}`} />
                            {isReflecting ? 'Analyse globale en cours...' : 'Forcer la Synchronisation'}
                        </button>
                    </div>

                    <div className="italic text-gray-300 text-sm leading-relaxed p-2 bg-gray-800/50 rounded border border-gray-700/50">
                        {synthesis ? `"${synthesis}"` : "Aucune analyse du Gardien pour le moment. Cliquez sur 'Forcer la Synchronisation' pour générer votre premier profilage global."}
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

                <div className="flex space-x-2 border-b border-gray-700 pb-4 mb-4 overflow-x-auto">
                    <button onClick={() => setActiveTab('travail')} className={`flex items-center px-4 py-2 rounded-t-lg font-semibold transition-all whitespace-nowrap ${activeTab === 'travail' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                        <Briefcase size={16} className="mr-2" /> Travail
                    </button>

                    {/* 🟢 NOUVEAU BOUTON IKIGAI */}
                    <button onClick={() => setActiveTab('ikigai')} className={`flex items-center px-4 py-2 rounded-t-lg font-semibold transition-all whitespace-nowrap ${activeTab === 'ikigai' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                        <Target size={16} className="mr-2" /> Ikigai & Morale
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

                    {/* 🟢 ZONE DE TEXTE LIBRE POUR AFFINER */}
                    <div className="mt-6 pt-6 border-t border-gray-700/50">
                        <label className="text-sm font-semibold text-gray-300 flex items-center mb-2">
                            <Edit3 size={14} className="mr-2 text-purple-400" />
                            Précisions libres (Nuances pour la section {activeTab})
                        </label>
                        <textarea
                            value={formData[activeTab]?.precisionsLibres || ''}
                            onChange={(e) => handleThematicChange(activeTab, 'precisionsLibres', e.target.value)}
                            placeholder={`Ajoutez ici vos nuances, lignes rouges spécifiques ou détails uniques concernant la matrice "${activeTab}"...`}
                            className="bg-gray-800 border border-gray-600 rounded p-3 text-sm focus:border-purple-500 outline-none w-full min-h-[100px] resize-y"
                        />
                    </div>
                </div>
            </div>

            {/* BOUTON GLOBAL DE SAUVEGARDE */}
            <button onClick={handleSave} className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 py-4 rounded-lg font-bold transition shadow-[0_0_15px_rgba(37,99,235,0.4)] text-lg">
                <Save className="mr-2" size={24} /> SAUVEGARDER L'ADN IPSE
            </button>
        </div>
    );
}
