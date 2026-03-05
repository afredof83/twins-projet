import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        // 1. Authentification du Cron (Vercel sécurise la route via un header secret)
        if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Sélectionner TOUS les utilisateurs éligibles (ceux qui ont un vecteur)
        const users = await prisma.profile.findMany({
            select: { id: true }
        });

        // 3. ⚡ ANTIGRAVITY : Création des événements de manière asynchrone
        const events = users.map(user => ({
            name: "radar/process.user" as const,
            data: { userId: user.id }
        }));

        // 4. On envoie TOUT à Inngest d'un coup (Batch dispatch)
        if (events.length > 0) {
            await inngest.send(events);
        }

        // 5. On répond à Vercel en quelques millisecondes.
        return NextResponse.json({
            success: true,
            message: `${events.length} utilisateurs mis en file d'attente.`
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
