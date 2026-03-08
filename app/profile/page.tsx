"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiUrl } from "@/lib/api";
import { getSessionToken } from "@/lib/auth";
import { useLanguage } from "@/context/LanguageContext";
import {
    Cpu, Palette, Briefcase, UserCog, HeartPulse, Hammer, MoreHorizontal,
    Users, Heart, GraduationCap, Globe,
    Trophy, Music, Palmtree, Utensils, Gamepad2, Dumbbell,
    ChevronRight, Search, CheckCircle2, Sparkles, Loader2, User, MapPin, Settings
} from "lucide-react";

// --- Configuration des Secteurs & Roles ---

const WORK_SECTORS = [
    { id: "TECH", icon: Cpu, roles: ["DEVELOPER", "DATA_SCIENTIST", "CTO", "PRODUCT_OWNER", "OTHER"] },
    { id: "DESIGN", icon: Palette, roles: ["DESIGNER", "UX_RESEARCHER", "ART_DIRECTOR", "OTHER"] },
    { id: "BUSINESS", icon: Briefcase, roles: ["SALES", "MARKETING", "BUSINESS_DEV", "OTHER"] },
    { id: "MANAGEMENT", icon: UserCog, roles: ["MANAGER", "HR", "OPERATIONS", "OTHER"] },
    { id: "HEALTH", icon: HeartPulse, roles: ["COACH", "THERAPIST", "MEDICAL", "OTHER"] },
    { id: "INDUSTRY", icon: Hammer, roles: ["ENGINEER", "CRAFTSMAN", "LOGISTICS", "OTHER"] },
    { id: "OTHER", icon: MoreHorizontal, roles: ["OTHER"] }
];

const SOCIAL_SECTORS = [
    { id: "FRIENDSHIP", icon: Users, roles: ["MEETING", "CHATTING", "PARTYING", "OTHER"] },
    { id: "DATING", icon: Heart, roles: ["SERIOUS", "CASUAL", "FRIENDLY", "OTHER"] },
    { id: "MENTORING", icon: GraduationCap, roles: ["MENTOR", "MENTEE", "ECHANGE", "OTHER"] },
    { id: "COMMUNITY", icon: Globe, roles: ["VOLUNTEER", "ACTIVIST", "MEMBER", "OTHER"] },
    { id: "PROFESSIONAL", icon: Briefcase, roles: ["PARTNER", "RECRUITER", "FOUNDER", "OTHER"] }
];

const HOBBY_SECTORS = [
    { id: "SPORT", icon: Dumbbell, roles: ["COACH", "PARTNER", "EXPERT", "BEGINNER", "OTHER"] },
    { id: "ARTS", icon: Music, roles: ["MUSICIAN", "PAINTER", "VISITOR", "COLLECTOR", "OTHER"] },
    { id: "GAMING", icon: Gamepad2, roles: ["PRO_PLAYER", "CASUAL", "RPG", "E_SPORT", "OTHER"] },
    { id: "TRAVEL", icon: Palmtree, roles: ["EXPLORER", "BACKPACKER", "HIKER", "OTHER"] },
    { id: "FOOD", icon: Utensils, roles: ["CHEF", "TOME", "GOURMET", "OTHER"] }
];

const AVAILABILITIES = [
    { id: "IMMEDIATE" },
    { id: "ONE_MONTH" },
    { id: "UNAVAILABLE" }
];

type PrismType = 'IDENTITY' | 'WORK' | 'SOCIAL' | 'HOBBY' | 'SETTINGS';

function ProfileContent() {
    const { language, setLanguage, t } = useLanguage();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<PrismType>('IDENTITY');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // --- Global Form State ---
    const [formData, setFormData] = useState({
        // General Identity
        name: "",
        age: "",
        gender: "",
        city: "",
        country: "",
        // Work
        workSector: "",
        workRole: "",
        workTjm: 400,
        workAvailability: "",
        workBio: "",
        // Social
        socialSector: "",
        socialRole: "",
        socialBio: "",
        // Hobby
        hobbySector: "",
        hobbyRole: "",
        hobbyBio: "",
    });

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const token = await getSessionToken();
                const { createClient } = await import('@/lib/supabaseBrowser');
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) return;

                const headers: any = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const apiUrl = getApiUrl(`/api/profile?id=${user.id}`);
                const res = await fetch(apiUrl, { headers });
                const data = await res.json();

                if (data.success && data.profile) {
                    const p = data.profile;
                    setFormData({
                        name: p.name || "",
                        age: p.age?.toString() || "",
                        gender: p.gender || "",
                        city: p.city || "",
                        country: p.country || "",
                        workSector: p.sector || "",
                        workRole: p.primaryRole || "",
                        workTjm: p.tjm || 400,
                        workAvailability: p.availability || "",
                        workBio: p.bio || "",
                        socialSector: p.socialSector || "",
                        socialRole: p.socialRole || "",
                        socialBio: p.socialBio || "",
                        hobbySector: p.hobbySector || "",
                        hobbyRole: p.hobbyRole || "",
                        hobbyBio: p.hobbyBio || "",
                    });
                    if (p.language && p.language !== language) {
                        setLanguage(p.language);
                    }
                }
            } catch (e) {
                console.error("Error loading profile data", e);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    const handleSave = async (type: PrismType) => {
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        let endpoint = "";
        let body = {};
        let method = 'PATCH';

        if (type === 'IDENTITY') {
            endpoint = '/api/profile';
            method = 'POST';
            body = {
                action: 'updateGeneralIdentity',
                name: formData.name,
                age: formData.age,
                gender: formData.gender,
                city: formData.city,
                country: formData.country
            };
        } else if (type === 'WORK') {
            endpoint = '/api/profile/work';
            body = {
                sector: formData.workSector,
                primaryRole: formData.workRole,
                tjm: formData.workTjm,
                availability: formData.workAvailability,
                bio: formData.workBio
            };
        } else if (type === 'SOCIAL') {
            endpoint = '/api/profile/social';
            body = {
                sector: formData.socialSector,
                role: formData.socialRole,
                bio: formData.socialBio
            };
        } else if (type === 'HOBBY') {
            endpoint = '/api/profile/hobby';
            body = {
                sector: formData.hobbySector,
                role: formData.hobbyRole,
                bio: formData.hobbyBio
            };
        }

        try {
            const token = await getSessionToken();
            const response = await fetch(getApiUrl(endpoint), {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) throw new Error("Erreur de synchronisation");

            setSuccess(t('profile.common.syncing'));
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLanguageChange = async (newLang: 'fr' | 'en') => {
        setIsSubmitting(true);
        try {
            const token = await getSessionToken();
            const res = await fetch(getApiUrl('/api/profile/settings'), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ language: newLang })
            });
            if (res.ok) {
                setLanguage(newLang);
                setSuccess(newLang === 'fr' ? 'Langue mise à jour !' : 'Language updated!');
                setTimeout(() => setSuccess(null), 3000);
            }
        } catch (e) {
            console.error("Language change error", e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentTheme = useMemo(() => {
        if (activeTab === 'IDENTITY') return { color: "blue", hex: "#3b82f6", bg: "blue-500/10" };
        if (activeTab === 'WORK') return { color: "emerald", hex: "#10b981", bg: "emerald-500/10" };
        if (activeTab === 'SOCIAL') return { color: "violet", hex: "#8b5cf6", bg: "violet-500/10" };
        if (activeTab === 'HOBBY') return { color: "orange", hex: "#f97316", bg: "orange-500/10" };
        return { color: "slate", hex: "#64748b", bg: "slate-500/10" };
    }, [activeTab]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-blue-500 font-mono">
                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                ...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 pb-40 lg:p-12">
            <header className="mb-8">
                <Link href="/" className="text-gray-500 hover:text-white text-sm mb-4 inline-flex items-center gap-2">
                    ← Radar
                </Link>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black italic tracking-tighter uppercase">{t('profile.title')}</h1>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase font-mono tracking-widest leading-none">{t('profile.subtitle')}</p>
                    </div>
                    {activeTab === 'SETTINGS' ? <Settings className="text-slate-400" /> : <Sparkles className={`text-${currentTheme.color}-500 animate-pulse`} />}
                </div>
            </header>

            {/* --- NAVIGATION PAR ONGLET --- */}
            <nav className="flex bg-gray-900/40 p-1.5 rounded-2xl mb-12 border border-gray-800 backdrop-blur-md sticky top-6 z-40 overflow-x-auto no-scrollbar">
                {(['IDENTITY', 'WORK', 'SOCIAL', 'HOBBY', 'SETTINGS'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-none min-w-[80px] py-3.5 px-4 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all duration-300 ${activeTab === tab
                            ? `bg-${currentTheme.color}-600 text-white shadow-xl scale-[1.02]`
                            : "text-gray-500 hover:text-gray-300"
                            }`}
                    >
                        {tab === 'IDENTITY' ? t('profile.tabs.identity') :
                            tab === 'SETTINGS' ? t('profile.tabs.settings') :
                                t(`profile.tabs.${tab.toLowerCase()}`)}
                    </button>
                ))}
            </nav>

            {/* --- CONTENU --- */}
            <div className="max-w-2xl mx-auto">
                <div className="space-y-12">
                    {activeTab === 'IDENTITY' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <section className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 italic">{t('profile.identity.pseudo')}</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-gray-900/40 border border-gray-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                        placeholder={t('profile.identity.pseudo_placeholder')}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 italic">{t('profile.identity.age')}</label>
                                        <input
                                            type="number"
                                            value={formData.age}
                                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                            className="w-full bg-gray-900/40 border border-gray-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                            placeholder="Ex: 28"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 italic">{t('profile.identity.sex')}</label>
                                        <select
                                            value={formData.gender}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                            className="w-full bg-gray-900/40 border border-gray-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none"
                                        >
                                            <option value="">{t('profile.identity.sex_placeholder')}</option>
                                            <option value="male">{t('profile.identity.sex_options.male')}</option>
                                            <option value="female">{t('profile.identity.sex_options.female')}</option>
                                            <option value="other">{t('profile.identity.sex_options.other')}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 italic">{t('profile.identity.city')}</label>
                                        <input
                                            type="text"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            className="w-full bg-gray-900/40 border border-gray-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                            placeholder="Ex: Paris"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 italic">{t('profile.identity.country')}</label>
                                        <input
                                            type="text"
                                            value={formData.country}
                                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                            className="w-full bg-gray-900/40 border border-gray-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                            placeholder="Ex: France"
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'WORK' && (
                        <PrismForm
                            theme="emerald"
                            sectors={WORK_SECTORS}
                            selectedSector={formData.workSector}
                            onSetSector={(s: string) => setFormData({ ...formData, workSector: s, workRole: "" })}
                            selectedRole={formData.workRole}
                            onSetRole={(r: string) => setFormData({ ...formData, workRole: r })}
                            bio={formData.workBio}
                            onSetBio={(b: string) => setFormData({ ...formData, workBio: b })}
                            t={t}
                            extraFields={
                                <>
                                    <section>
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic">{t('profile.work.tjm')}</label>
                                            <span className="text-xl font-mono text-emerald-400">{formData.workTjm} €</span>
                                        </div>
                                        <input
                                            type="range" min="100" max="2500" step="50"
                                            value={formData.workTjm}
                                            onChange={(e) => setFormData({ ...formData, workTjm: Number(e.target.value) })}
                                            className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                        />
                                    </section>
                                    <section>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 italic">{t('profile.work.availability')}</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {AVAILABILITIES.map(a => (
                                                <button
                                                    key={a.id} type="button"
                                                    onClick={() => setFormData({ ...formData, workAvailability: a.id })}
                                                    className={`p-4 rounded-xl border text-xs text-left transition-all ${formData.workAvailability === a.id ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-gray-900/40 border-gray-800 text-gray-500"
                                                        }`}
                                                >
                                                    {t(`profile.availabilities.${a.id}`)}
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                </>
                            }
                        />
                    )}

                    {activeTab === 'SOCIAL' && (
                        <PrismForm
                            theme="violet"
                            sectors={SOCIAL_SECTORS}
                            selectedSector={formData.socialSector}
                            onSetSector={(s: string) => setFormData({ ...formData, socialSector: s, socialRole: "" })}
                            selectedRole={formData.socialRole}
                            onSetRole={(r: string) => setFormData({ ...formData, socialRole: r })}
                            bio={formData.socialBio}
                            onSetBio={(b: string) => setFormData({ ...formData, socialBio: b })}
                            t={t}
                        />
                    )}

                    {activeTab === 'HOBBY' && (
                        <PrismForm
                            theme="orange"
                            sectors={HOBBY_SECTORS}
                            selectedSector={formData.hobbySector}
                            onSetSector={(s: string) => setFormData({ ...formData, hobbySector: s, hobbyRole: "" })}
                            selectedRole={formData.hobbyRole}
                            onSetRole={(r: string) => setFormData({ ...formData, hobbyRole: r })}
                            bio={formData.hobbyBio}
                            onSetBio={(b: string) => setFormData({ ...formData, hobbyBio: b })}
                            t={t}
                        />
                    )}

                    {activeTab === 'SETTINGS' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <section className="p-6 rounded-3xl bg-gray-900/40 border border-gray-800">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 italic">{t('settings.language')}</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleLanguageChange('fr')}
                                        className={`py-4 rounded-2xl border font-bold transition-all ${language === 'fr' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-gray-800/50 border-gray-700 text-gray-500'}`}
                                    >
                                        🇫🇷 Français
                                    </button>
                                    <button
                                        onClick={() => handleLanguageChange('en')}
                                        className={`py-4 rounded-2xl border font-bold transition-all ${language === 'en' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-gray-800/50 border-gray-700 text-gray-500'}`}
                                    >
                                        🇺🇸 English
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}
                </div>

                {/* --- FEEDBACK --- */}
                <div className="h-6">
                    {error && <div className="mt-8 text-red-500 text-[10px] bg-red-500/10 p-3 rounded-xl border border-red-500/20 animate-in fade-in">{error}</div>}
                    {success && <div className="mt-8 text-emerald-500 text-[10px] bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 size={12} /> {success}
                    </div>}
                </div>
            </div>

            {/* --- ACTION BAR --- */}
            {activeTab !== 'SETTINGS' && (
                <div className="fixed bottom-0 left-0 w-full p-6 md:p-10 bg-gradient-to-t from-black via-black/95 to-transparent z-50">
                    <div className="max-w-xl mx-auto">
                        <button
                            onClick={() => handleSave(activeTab)}
                            disabled={isSubmitting}
                            className={`w-full py-5 rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${isSubmitting ? "bg-gray-900 text-gray-600 cursor-not-allowed" : `bg-${currentTheme.color}-600 hover:bg-${currentTheme.color}-500 text-white`
                                }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('profile.common.syncing')}
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    {activeTab === 'IDENTITY' ? t('profile.identity.update_btn') :
                                        activeTab === 'WORK' ? t('profile.work.update_btn') :
                                            activeTab === 'SOCIAL' ? t('profile.social.update_btn') :
                                                activeTab === 'HOBBY' ? t('profile.hobby.update_btn') : `Update ${activeTab}`}
                                </>
                            )}
                        </button>
                        <p className="text-[9px] text-gray-600 text-center mt-4 font-mono uppercase tracking-widest italic">
                            {t('profile.common.encrypt_note')}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Internal Component: PrismForm ---
function PrismForm({ theme, sectors, selectedSector, onSetSector, selectedRole, onSetRole, bio, onSetBio, t, extraFields }:
    { theme: string, sectors: any[], selectedSector: string, onSetSector: (s: string) => void, selectedRole: string, onSetRole: (r: string) => void, bio: string, onSetBio: (b: string) => void, t: any, extraFields?: React.ReactNode }) {

    const selectedSectorData = sectors.find((s: any) => s.id === selectedSector);

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. Secteur */}
            <section>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 italic">{t('profile.common.dimension')}</label>
                <div className="grid grid-cols-2 gap-3">
                    {sectors.map((s: any) => {
                        const Icon = s.icon;
                        const isSelected = selectedSector === s.id;
                        return (
                            <button
                                key={s.id} type="button"
                                onClick={() => onSetSector(s.id)}
                                className={`p-5 rounded-3xl border flex flex-col items-center gap-2 transition-all duration-300 ${isSelected ? `bg-${theme}-500/10 border-${theme}-500 text-${theme}-400 shadow-[0_0_20px_-5px_rgba(var(--${theme}-rgb),0.3)]` : "bg-gray-900/40 border-gray-800 text-gray-600 hover:border-gray-700"
                                    }`}
                            >
                                <Icon size={24} strokeWidth={1} />
                                <span className="text-[10px] font-bold text-center leading-tight tracking-tight">{t(`profile.sectors.${s.id}`)}</span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* 2. Role */}
            {selectedSector && (
                <section className="animate-in slide-in-from-top-4 duration-400">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5 italic">{t('profile.common.position')}</label>
                    <div className="flex flex-wrap gap-2">
                        {selectedSectorData?.roles.map((r: string) => (
                            <button
                                key={r} type="button"
                                onClick={() => onSetRole(r)}
                                className={`px-5 py-2.5 rounded-full text-[10px] font-bold border transition-all duration-300 ${selectedRole === r ? `bg-${theme}-500 text-black border-${theme}-500 shadow-lg` : "bg-gray-900/60 border-gray-800 text-gray-500"
                                    }`}
                            >
                                {r.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* 3. Extra */}
            {extraFields}

            {/* 4. Bio */}
            <section>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5 italic">{t('profile.common.bio')}</label>
                <textarea
                    value={bio}
                    onChange={(e) => onSetBio(e.target.value)}
                    placeholder={t('profile.common.bio_placeholder')}
                    className={`w-full bg-gray-900/30 border border-gray-800 rounded-3xl p-6 text-[12px] text-gray-200 outline-none focus:ring-2 focus:ring-${theme}-500/20 min-h-[160px] resize-none transition-all placeholder:text-gray-700`}
                />
            </section>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
            <ProfileContent />
        </Suspense>
    );
}