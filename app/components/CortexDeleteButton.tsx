"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api";

interface CortexDeleteButtonProps {
    action: "deleteMemory" | "deleteNote" | "deleteCortexMemory" | "deleteDiscovery";
    payload: Record<string, any>;
    onDelete?: () => void;
    className?: string;
    iconSize?: number;
}

export default function CortexDeleteButton({
    action,
    payload,
    onDelete,
    className = "p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100",
    iconSize = 16
}: CortexDeleteButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (isDeleting) return;

        if (!confirm("Confirmer la suppression ?")) return;

        setIsDeleting(true);
        try {
            const { createClient } = await import('@/lib/supabaseBrowser');
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const res = await fetch(getApiUrl("/api/cortex"), {
                method: "POST",
                headers,
                body: JSON.stringify({ action, ...payload }),
            });

            if (res.ok) {
                if (onDelete) onDelete();
                router.refresh();
            } else {
                const error = await res.json();
                console.error(`[CORTEX DELETE] Erreur:`, error);
                alert("Erreur lors de la suppression.");
            }
        } catch (err) {
            console.error(`[CORTEX DELETE] Erreur critique:`, err);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`${className} ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
            title="Supprimer"
        >
            <Trash2 style={{ width: iconSize, height: iconSize }} />
        </button>
    );
}
