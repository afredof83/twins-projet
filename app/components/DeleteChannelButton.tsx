'use client';

import { Trash2 } from 'lucide-react';
import { deleteChannel } from '@/app/actions/chat';

export default function DeleteChannelButton({ connectionId }: { connectionId: string }) {
    return (
        <button
            onClick={async (e) => {
                e.stopPropagation();
                if (confirm("Voulez-vous supprimer ce canal sécurisé ?")) {
                    await deleteChannel(connectionId);
                }
            }}
            className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
        >
            <Trash2 className="w-4 h-4" />
        </button>
    );
}
