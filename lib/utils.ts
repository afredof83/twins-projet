import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Nettoyage final : "Profil à définir"
export function getAgentName(profile: any) {
    // Adaptation à notre schéma : "name" au lieu de "fullName"
    let name = "AGENT_FURTIF";
    if (profile?.name) name = profile.name;
    else if (profile?.id) name = `AGENT_${profile.id.slice(0, 4).toUpperCase()}`;

    if (typeof name === 'object') return JSON.stringify(name);
    return name;
}
