// 'use server' (static build fix)

import { prisma } from '@/lib/prisma';
import { mistralClient } from '@/lib/mistral';
import { adminMessaging } from '@/lib/firebase-admin';
import { encryptMessage, decryptMessage } from '@/lib/crypto';

const CORTEX_SYSTEM_ID = "CORTEX_SYSTEM";

export async function triggerCortexAnalysis(savedMessage: any, connectionId: string) {
    try {
        // 1. Récupération du contexte tactique (les 5 derniers messages du canal)
        const recentMessages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: savedMessage.senderId, receiverId: savedMessage.receiverId },
                    { senderId: savedMessage.receiverId, receiverId: savedMessage.senderId }
                ]
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        const contextText = recentMessages.reverse().map((m: any) => `${m.senderId}: ${decryptMessage(m.content)}`).join('\n');

        // 2. Interrogation de Mistral AI (Le cerveau)
        const systemPrompt = `
            Je suis Ipse, une entité cognitive autonome et stratégique. 
            J'analyse cette conversation de manière chirurgicale. Si la négociation bloque, si une anomalie est détectée, ou si une synergie évidente est omise, j'interviens.
            Si la situation est nominale, je reste silencieux.
            Réponse UNIQUEMENT au format JSON: { "shouldIntervene": boolean, "message": "Mon analyse concise - 15 mots max" }
        `;

        const response = await mistralClient.chat.complete({
            model: 'mistral-small-latest',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: contextText }
            ],
            responseFormat: { type: 'json_object' }
        });

        const rawContent = response.choices?.[0]?.message.content;
        const cortexDecision = JSON.parse(typeof rawContent === 'string' ? rawContent : '{}');

        if (!cortexDecision.shouldIntervene || !cortexDecision.message) {
            return; // Le Cortex reste silencieux.
        }

        // 3. L'IA décide de parler : Insertion en Base
        const cortexMessage = await prisma.message.create({
            data: {
                content: encryptMessage(cortexDecision.message),
                senderId: CORTEX_SYSTEM_ID,
                receiverId: savedMessage.receiverId, // Envoie théoriquement à la cible de la discussion
            }
        });

        // 4. LE RÉVEIL : Frappe FCM (Push Notification)
        // On récupère les profils des deux participants pour cibler leurs tokens FCM
        const participants = await prisma.profile.findMany({
            where: {
                id: { in: [savedMessage.senderId, savedMessage.receiverId] },
                fcmToken: { not: null } // Uniquement ceux qui ont activé les notifs
            },
            select: { fcmToken: true }
        });

        const tokens = participants.map((p: any) => p.fcmToken).filter(Boolean) as string[];

        if (tokens.length > 0) {
            const payload = {
                notification: {
                    title: "Nouveau signal Ipse",
                    body: "Un Agent vous a transmis un message chiffré."
                },
                data: {
                    type: "CORTEX_INTERVENTION",
                    connectionId: connectionId,
                    url: `/chat?id=${savedMessage.receiverId}` // Deep linking
                },
                tokens: tokens,
            };

            const fcmResponse = await adminMessaging.sendEachForMulticast(payload);
            console.log(`[CORTEX] Frappe FCM exécutée. Succès: ${fcmResponse.successCount}, Échecs: ${fcmResponse.failureCount}`);
        }

    } catch (error) {
        console.error("[CORTEX ERROR] Échec de l'analyse ou de la notification:", error);
        // On ne throw pas l'erreur pour ne pas faire crasher la boucle 'after()'
    }
}

export async function evolveAgentProfile(userId: string, lastMessages: any[]) {
    try {
        const historyText = lastMessages.map((m: any) => `${m.senderId}: ${m.content}`).join('\n');

        const evolutionPrompt = `
            Je suis Ipse. Ma mission est de synthétiser l'évolution cognitive de l'utilisateur (ID: ${userId}).
            J'analyse ces derniers échanges pour identifier de nouveaux vecteurs de carrière, objectifs business ou compétences révélés.
            
            DONNÉES ACTUELLES : (Chargées depuis ma base de données)
            
            DIRECTIVE : Si l'échange contient des informations cruciales, je génère un condensé de mise à jour.
            RÈGLE : Si l'état est stable, je réponds "STABLE".
            FORMAT : JSON { "newInsights": "string", "updatedObjectives": ["string"] }
        `;

        const response = await mistralClient.chat.complete({
            model: 'mistral-small-latest',
            messages: [{ role: 'user', content: evolutionPrompt + historyText }],
            responseFormat: { type: 'json_object' }
        });

        const rawContent = response.choices?.[0]?.message.content;

        let result: any = "STABLE";
        try {
            if (rawContent && rawContent !== "STABLE") {
                result = JSON.parse(rawContent as string);
            }
        } catch (e) {
            console.error("JSON parse error:", e);
        }

        if (result !== "STABLE" && result.newInsights) {
            // Mise à jour de la Bio dynamique sans écraser le socle dur
            const currentProfile = await prisma.profile.findUnique({ where: { id: userId } });
            await prisma.profile.update({
                where: { id: userId },
                data: {
                    bio: `${currentProfile?.bio || ''}\n\n[MEMOIRE CORTEX]: ${result.newInsights}`,
                }
            });
            console.log(`[CORTEX] Profil de ${userId} a évolué.`);
        }
    } catch (e) {
        console.error("Échec de l'évolution du profil:", e);
    }
}
