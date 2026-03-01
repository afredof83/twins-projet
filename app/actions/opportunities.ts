'use server';
import { mistralClient } from '@/lib/mistral';
import prisma from '@/lib/prisma'; // Assurez-vous que l'import de prisma est correct

// 1. AUDIT PROFOND
export async function performAudit(oppId: string) {
    try {
        // 1. On récupère l'opportunité avec les relations exactes
        const opp = await prisma.opportunity.findUnique({
            where: { id: oppId },
            include: {
                sourceProfile: true, // Vérifie que c'est bien le nom de ta relation Prisma
                targetProfile: true
            }
        });

        if (!opp || !opp.sourceProfile || !opp.targetProfile) {
            return { success: false, error: "Données introuvables" };
        }

        // 2. On construit le prompt avec les BONS noms de colonnes (name, role, bio)
        const prompt = `
      Agis comme une IA d'analyse stratégique (Le Cortex).
      Réalise un audit profond et hyper-personnalisé pour évaluer une collaboration entre ces deux agents :

      AGENT 1 (${opp.sourceProfile.name || 'Anonyme'}) : 
      Rôle : ${opp.sourceProfile.role || 'Non défini'}
      Bio : ${opp.sourceProfile.bio || 'Non définie'}

      AGENT 2 (${opp.targetProfile.name || 'Anonyme'}) : 
      Rôle : ${opp.targetProfile.role || 'Non défini'}
      Bio : ${opp.targetProfile.bio || 'Non définie'}

      Détaille :
      1. Les synergies exactes basées sur leurs vraies compétences.
      2. 3 opportunités d'actions très concrètes qu'ils peuvent faire ensemble.
      3. Un titre accrocheur pour leur conversation.
      Sois direct, pro, et orienté business/innovation.
    `;

        console.log("🕵️ [AUDIT DEBUG] Envoi à Mistral :", prompt);

        // 3. Appel à Mistral
        const auditResponse = await mistralClient.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }]
        });

        const content = auditResponse.choices[0]?.message.content;
        const auditResult = typeof content === 'string' ? content : "Erreur d'analyse.";

        // 4. Sauvegarde en BDD
        await prisma.opportunity.update({
            where: { id: oppId },
            data: { audit: auditResult, status: 'AUDITED' }
        });

        return { success: true, audit: auditResult };

    } catch (error) {
        console.error("Erreur Audit:", error);
        return { success: false, error: "Crash de l'audit" };
    }
}

// 2. ENVOYER INVITATION
export async function sendChatInvite(oppId: string, customTitle: string) {
    try {
        // 1. On récupère l'opportunité et les profils
        const opp = await prisma.opportunity.findUnique({
            where: { id: oppId },
            include: { targetProfile: true, sourceProfile: true }
        });

        if (!opp) throw new Error("Opportunité introuvable");

        // 2. ON MET À JOUR LA BDD D'ABORD (L'invitation est créée quoi qu'il arrive)
        await prisma.opportunity.update({
            where: { id: oppId },
            data: { title: customTitle, status: 'INVITED' }
        });

        // 3. ENVOI DE LA NOTIFICATION (Optionnel : on ne crashe pas si pas de token)
        if (opp.targetProfile?.fcmToken) {
            const admin = (await import('firebase-admin')).default;
            // On s'assure que Firebase est initialisé (pushSender.ts le fait, mais au cas où)
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                    }),
                });
            }

            const message = {
                notification: {
                    title: `📩 Nouvelle Invitation : ${customTitle}`,
                    body: `${opp.sourceProfile?.name || 'Un agent'} souhaite ouvrir un canal avec vous.`,
                },
                data: {
                    type: 'CHAT_INVITATION',
                    opportunityId: oppId,
                    url: `/cortex/invitation/${oppId}`
                },
                token: opp.targetProfile.fcmToken,
            };

            try {
                await admin.messaging().send(message as any);
                console.log("✅ [OPP] Notification Push envoyée avec succès.");
            } catch (notifError) {
                console.error("⚠️ [OPP] Erreur Push (mais invitation créée) :", notifError);
            }
        } else {
            console.log("⚠️ [OPP] Cible sans fcmToken. Invitation créée en BDD mais pas de notification Push envoyée.");
        }

        return { success: true };
    } catch (error: any) {
        console.error("❌ [OPP] Erreur envoi invitation:", error);
        return { success: false, error: error.message };
    }
}

// 3. ACCEPTER L'INVITATION (Création de Canal)
export async function acceptInvite(oppId: string) {
    try {
        const opp = await prisma.opportunity.findUnique({
            where: { id: oppId }
        });

        if (!opp) throw new Error("Opportunité expirée ou introuvable");

        // 1. On crée le canal de communication (Table Connection)
        const newConnection = await prisma.connection.create({
            data: {
                initiatorId: opp.sourceId,
                receiverId: opp.targetId,
                status: 'ACCEPTED' // On l'accepte d'emblée
            }
        });

        // 2. On clôture l'opportunité
        await prisma.opportunity.update({
            where: { id: oppId },
            data: { status: 'ACCEPTED' }
        });

        return { success: true, connectionId: newConnection.id };
    } catch (error) {
        console.error("❌ [OPP] Erreur acceptation invitation:", error);
        return { success: false, error };
    }
}

// 3. BLOQUER / ANNULER
export async function updateOppStatus(oppId: string, status: 'BLOCKED' | 'CANCELLED') {
    return await prisma.opportunity.update({
        where: { id: oppId },
        data: { status }
    });
}
