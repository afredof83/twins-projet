'use server';
import { mistralClient } from '@/lib/mistral';
import prisma from '@/lib/prisma'; // Assurez-vous que l'import de prisma est correct
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Helper for auth
async function getAuthUser() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
                set(name, value, options) { },
                remove(name, options) { }
            }
        }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");
    return user;
}

// 1. AUDIT PROFOND
export async function performAudit(oppId: string) {
    try {
        const user = await getAuthUser();
        const myId = user.id;

        // 1. On récupère l'opportunité avec les relations exactes
        const opp = await prisma.opportunity.findUnique({
            where: { id: oppId },
            include: {
                sourceProfile: true,
                targetProfile: true
            }
        });

        if (!opp || !opp.sourceProfile || !opp.targetProfile) {
            return { success: false, error: "Données introuvables" };
        }

        // Identifier clairement qui est la cible (l'autre agent)
        const targetProfile = opp.sourceId === myId ? opp.targetProfile : opp.sourceProfile;

        // 2. On construit le prompt avec un FOCUS REQUIS STRICT SUR LA CIBLE
        const prompt = `
Tu es le Cortex, une IA de renseignement stratégique B2B.

RÈGLES DE SURVIE ABSOLUES :
1. RÉPOND UNIQUEMENT EN JSON VALIDE. Aucun texte avant, aucun texte après. Pas de balises markdown.
2. FORMATAGE : Interdiction d'utiliser des astérisques (*), des tirets (-) ou des dièses (#).
3. ACTIONS : Donne exactement 2 ou 3 actions ultra-concises orientées rentabilité.

NOUVELLE DIRECTIVE STRICTE :
Dans la section 'Match Stratégique' (le champ 'synergies'), tu dois UNIQUEMENT décrire l'identité et l'activité de la CIBLE détectée. 
Ne cite JAMAIS l'utilisateur qui fait la recherche (toi, l'utilisateur courant, etc.). Fais un résumé direct de la cible détectée sous ce format : "[Nom de la cible] est [Métier de la cible]. Il/Elle cherche à [Objectif]."

FORMAT ATTENDU :
{
  "synergies": "[Nom de la cible] est [Métier]. Il cherche à [Objectif].",
  "actions": [
    "Action précise 1",
    "Action précise 2"
  ]
}

CIBLE DÉTECTÉE (${targetProfile.name || 'La Cible'}) : 
Rôle : ${targetProfile.role || 'Non défini'}
Bio : ${targetProfile.bio || 'Non définie'}
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

        revalidatePath('/');
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

        revalidatePath('/');
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

// 4. GET OPPORTUNITY
export async function getOpportunity(oppId: string) {
    try {
        if (!oppId) throw new Error("Missing ID");
        const opp = await prisma.opportunity.findUnique({
            where: { id: oppId },
            include: { sourceProfile: true, targetProfile: true }
        });
        if (!opp) throw new Error("Not found");
        return { success: true, opportunity: opp };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 5. GET OPPORTUNITIES
export async function getOpportunities(profileId: string) {
    try {
        if (!profileId) throw new Error("Missing ID");
        const opps = await prisma.opportunity.findMany({
            where: {
                OR: [
                    { sourceId: profileId, targetId: { not: profileId } },
                    { targetId: profileId, sourceId: { not: profileId } }
                ]
            },
            include: { sourceProfile: true, targetProfile: true },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, opportunities: opps };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 6. SCOUT (Trigger Radar) - This just triggers forceHuntSync
export async function scoutOpportunities(profileId: string) {
    try {
        const { forceHuntSync } = await import('./radar');
        await forceHuntSync();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
// 7. DELETE OPPORTUNITY
export async function deleteOpportunity(oppId: string) {
    try {
        if (!oppId) throw new Error("Missing ID");
        await prisma.opportunity.delete({ where: { id: oppId } });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
