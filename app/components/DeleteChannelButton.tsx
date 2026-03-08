'use client';

import { Trash2 } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
// Server action supprimée — on utilise fetch vers /api/chat
import { useRouter } from 'next/navigation';

export default function DeleteChannelButton({ connectionId }: { connectionId: string }) {
    const router = useRouter();

    const handleDeleteChannel = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Voulez-vous supprimer ce canal sécurisé ?")) return;

        try {
            const { createClient } = await import('@/lib/supabaseBrowser');
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            // 1. Appel au serveur blindé via API REST
            const res = await fetch(getApiUrl('/api/chat'), {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ connectionId })
            });
            const result = await res.json();

            // 2. Traitement du cas "Fantôme" (User A a déjà supprimé)
            if (!result.success) {
                alert("Action impossible : " + result.error);
                router.push('/');
                return;
            }

            // 3. Traitement du Succès normal
            router.push('/');
        } catch (error) {
            console.error("Erreur suppression canal:", error);
            alert("Erreur réseau lors de la suppression.");
            router.push('/');
        }
    };

    return (
        <button
            onClick={handleDeleteChannel}
            className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
        >
            <Trash2 className="w-4 h-4" />
        </button>
    );
}
