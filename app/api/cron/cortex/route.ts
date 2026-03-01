import { NextResponse } from 'next/server';
import { sendCortexAlert } from '@/lib/pushSender';
import prisma from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';

export async function GET(req: Request) {
    // 1. SÉCURITÉ : Vérification Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Accès refusé.', { status: 401 });
    }

    try {
        // 2. Identification de la cible (Profil avec Token)
        const profile = await prisma.profile.findFirst({
            where: { fcmToken: { not: null } },
            select: {
                id: true,
                name: true,
                bio: true,
                role: true,
                profession: true,
                thematicProfile: true,
                fcmToken: true
            }
        });

        if (!profile) return NextResponse.json({ success: false, message: 'Aucun profil actif.' });

        // 3. RÉCUPÉRATION DE LA MÉMOIRE (Les 5 derniers messages)
        const lastMessages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: profile.id },
                    { receiverId: profile.id }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        // On les remet dans l'ordre chronologique et on formate
        const historyContext = lastMessages.length > 0
            ? lastMessages.reverse().map(m => `${m.senderId === profile.id ? 'L\'utilisateur' : 'Le Cortex'}: ${m.content}`).join('\n')
            : "Aucun échange récent.";

        // 4. CONSTRUCTION DU PROMPT PSYCHOLOGIQUE
        const systemPrompt = `
      Tu es le Cortex, l'IA de surveillance du Jumeau Numérique de ${profile.name || 'l\'utilisateur'}.
      CONTEXTE PROFIL : ${profile.bio || 'Inconnu'}
      RÔLE : ${profile.role || 'Non défini'}
      PROFESSION : ${profile.profession || 'Non renseignée'}
      MÉMOIRE RÉCENTE :
      ${historyContext}

      MISSION : Rédige une notification Push (12 mots max).
      - Si la mémoire contient une discussion, fais une référence subtile ou pose une question de suivi.
      - Si la mémoire est vide, sois mystérieux et rassurant sur la sécurité des données.
      - Ton ton est minimaliste, froid, mais protecteur.
    `;

        // 5. APPEL MISTRAL
        const chatResponse = await mistralClient.chat.complete({
            model: 'mistral-small-latest',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Génère l\'alerte de veille.' }
            ]
        });

        const aiThought = chatResponse.choices?.[0]?.message.content || "Système intègre. Je veille.";

        // 6. TIR DU MISSILE avec deep link
        await sendCortexAlert(profile.id, "🧠 Cortex", aiThought as string, { url: "/cortex" });

        return NextResponse.json({ success: true, thought: aiThought });

    } catch (error: any) {
        console.error('[CORTEX CRON ERROR]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}