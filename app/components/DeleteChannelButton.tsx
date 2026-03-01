'use client';

import { Trash2 } from 'lucide-react';
import { deleteChannel } from '@/app/actions/chat';
import { useRouter } from 'next/navigation';

export default function DeleteChannelButton({ connectionId }: { connectionId: string }) {
    const router = useRouter();

    const handleDeleteChannel = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Voulez-vous supprimer ce canal sécurisé ?")) return;

        // 1. Appel au serveur blindé
        const result = await deleteChannel(connectionId);

        // 2. Traitement du cas "Fantôme" (User A a déjà supprimé)
        if (!result.success) {
            alert("Action impossible : " + result.error); // Idéalement, utilisez un Toast UI ici
            router.push('/'); // On téléporte User B hors de ce chat fantôme
            return;
        }

        // 3. Traitement du Succès normal
        router.push('/'); // On le ramène au menu principal ou au Radar
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
