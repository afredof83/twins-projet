import { NextResponse } from 'next/server';
import { sendCortexAlert } from '@/lib/pushSender';
import prisma from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';

export async function GET(req: Request) {
    // 1. SÉCURITÉ : Vérification du mot de passe Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Accès refusé. Réservé au système.', { status: 401 });
    }

    try {
        // 2. Trouver un profil avec une antenne radio active
        const profile = await prisma.profile.findFirst({
            where: { fcmToken: { not: null } }
        });

        if (!profile) {
            return NextResponse.json({ success: false, message: 'Cible introuvable.' });
        }

        // 3. Le Cortex réfléchit (Appel à Mistral)
        const chatResponse = await mistralClient.chat.complete({
            model: 'mistral-small-latest',
            messages: [{
                role: 'user',
                content: 'Tu es le Cortex, l\'IA d\'un Jumeau Numérique. Rédige une phrase très courte (10 mots max) et un peu mystérieuse pour notifier l\'utilisateur que tu surveilles ses données et que tout est sécurisé.'
            }]
        });

        const aiThought = chatResponse.choices?.[0]?.message.content || "Le système est stable. Je veille.";

        // 4. Tir de la notification vers le smartphone
        await sendCortexAlert(profile.id, "🧠 Cortex", aiThought as string);

        return NextResponse.json({ success: true, message: 'Pensée transmise.' });

    } catch (error: any) {
        console.error('[CRON CRASH]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
