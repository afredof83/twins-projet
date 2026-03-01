import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Nettoyage final : "Profil à définir"
export function getAgentName(profile: any) {
    // Adaptation à notre schéma : "name" au lieu de "fullName"
    if (profile?.name) return profile.name;
    if (profile?.id) return `AGENT_${profile.id.slice(0, 4).toUpperCase()}`;
    return "AGENT_FURTIF";
}
