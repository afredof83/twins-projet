import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) return NextResponse.json({ contacts: [] });

    try {
        // 1. On récupère TOUS les messages où vous êtes impliqué
        const { data: messages, error } = await supabase
            .from('Message')
            .select('fromId, toId, content, createdAt, isRead')
            .or(`fromId.eq.${profileId},toId.eq.${profileId}`)
            .order('createdAt', { ascending: false }); // Du plus récent au plus vieux

        if (error) throw error;

        // 2. On extrait les interlocuteurs uniques
        const contactsMap = new Map();

        messages.forEach((msg: any) => {
            // Déterminer qui est l'autre personne
            const otherId = msg.fromId === profileId ? msg.toId : msg.fromId;

            // On ne s'ajoute pas soi-même
            if (otherId === profileId) return;

            // Si on n'a pas encore vu ce contact, on l'ajoute
            if (!contactsMap.has(otherId)) {
                contactsMap.set(otherId, {
                    id: otherId,
                    lastMessage: msg.content,
                    lastActive: msg.createdAt,
                    hasUnread: (msg.toId === profileId && !msg.isRead) // Vrai si c'est pour moi et pas lu
                });
            } else {
                // Si le contact existe déjà, on vérifie juste s'il a des messages non lus plus vieux
                const existing = contactsMap.get(otherId);
                if (msg.toId === profileId && !msg.isRead) {
                    existing.hasUnread = true;
                }
            }
        });

        // Convertir la Map en tableau
        const contacts = Array.from(contactsMap.values());

        return NextResponse.json({ contacts });

    } catch (e) {
        console.error("Erreur contacts:", e);
        return NextResponse.json({ contacts: [] });
    }
}