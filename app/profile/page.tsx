'use client'

import AgentConfig from '@/components/AgentConfig';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ProfilePage() {
    const [profileId, setProfileId] = useState<string | null>(null);

    // Récupération de l'ID du profil local
    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setProfileId(user.id);
            }
        };
        fetchUser();
    }, []);

    if (!profileId) return <div className="text-white text-center mt-20">Chargement de l'Agent...</div>;

    return (
        <div className="min-h-screen bg-black flex flex-col items-center pt-10 px-4">
            {/* L'APPEL AU NOUVEAU COMPOSANT À ONGLETS */}
            <AgentConfig profileId={profileId} />
        </div>
    );
}
