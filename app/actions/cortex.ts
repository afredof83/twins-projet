'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { mistralClient } from '@/lib/mistral'

export async function deleteMemory(formData: FormData) {
    const fileId = formData.get('fileId') as string;
    const fileUrl = formData.get('fileUrl') as string;

    if (!fileId || !fileUrl) return;

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");

    try {
        // 1. Suppression physique du fichier dans le Storage Supabase
        const { error: storageError } = await supabase.storage.from('cortex_files').remove([fileUrl]);
        if (storageError) {
            console.error("[DELETE] Erreur Storage:", storageError);
        }

        // 2. Suppression de la trace dans la base de données Prisma
        // (Le "profileId: user.id" est notre sécurité Zero-Trust : on s'assure qu'il supprime bien SON fichier)
        await prisma.fileArchive.delete({
            where: {
                id: fileId,
                profileId: user.id
            }
        });

        console.log(`[DELETE] Mémoire ${fileId} purgée avec succès.`);

        // 3. Rafraîchissement automatique des données à l'écran
        revalidatePath('/cortex');
        revalidatePath('/');

    } catch (error) {
        console.error("[DELETE] Erreur critique lors de la suppression:", error);
    }
}

export async function deleteNote(formData: FormData) {
    const noteId = formData.get('noteId') as string;

    if (!noteId) return;

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");

    try {
        // Suppression de la note IA (avec vérification de propriété)
        await prisma.cortexNote.delete({
            where: {
                id: noteId,
                profileId: user.id
            }
        });

        console.log(`[DELETE] Note IA ${noteId} effacée de la mémoire.`);

        // Rafraîchissement de l'interface
        revalidatePath('/cortex');

    } catch (error) {
        console.error("[DELETE] Erreur lors de la suppression de la note:", error);
    }
}

export async function deleteDiscovery(formData: FormData) {
    const id = formData.get('id') as string;

    // Vérification de sécurité (Zero-Trust) avec Supabase
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");

    try {
        await prisma.discovery.delete({
            where: {
                id: id,
                profileId: user.id
            }
        });

        revalidatePath('/'); // Rafraîchit le Dashboard
    } catch (error) {
        console.error("Erreur lors de la suppression de la découverte:", error);
    }
}

export async function updateIdentity(answer: string, field: 'bio' | 'role' | 'tjm') {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");

    try {
        let updateData: any = {};
        if (field === 'tjm') {
            updateData.tjm = parseInt(answer, 10);
        } else {
            // Append rather than overwrite for bio if it already exists to not lose data
            const currentProfile = await prisma.profile.findUnique({ where: { id: user.id } });
            if (field === 'bio' && currentProfile?.bio) {
                updateData.bio = `${currentProfile.bio}\n\n[Mise à jour Agent]: ${answer}`;
            } else {
                updateData[field] = answer;
            }
        }

        await prisma.profile.update({
            where: { id: user.id },
            data: updateData
        });

        revalidatePath('/');
        revalidatePath('/profile');

        return { success: true };
    } catch (error) {
        console.error("[UPDATE IDENTITY] Erreur:", error);
        return { success: false, error: "Erreur lors de la mise à jour de l'identité." };
    }
}

export async function forceHuntSync() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non autorisé");

    const currentUserId = user.id;

    console.log("Agent: Recherche de synergies réelles dans la Ruche...");

    // 2. L'Agent cherche un AUTRE profil dans la base (Le Profil B)
    const otherProfile = await prisma.profile.findFirst({
        where: {
            id: { not: currentUserId } // On cherche quelqu'un qui n'est pas nous
        }
    });

    if (!otherProfile) {
        console.error("Aucun autre agent trouvé. As-tu bien créé ton Profil B ?");
        return;
    }

    // On nettoie la table pour le test
    await prisma.discovery.deleteMany();

    // 1. L'Agent crée une simple suggestion pour TOI uniquement
    await prisma.discovery.create({
        data: {
            profileId: currentUserId,
            title: "Partenariat Industriel - Leurres",
            company: otherProfile.role || "Agent B",
            score: 92,
            reason: "Recherche active de licences pour brevets. Synergie détectée.",
            url: otherProfile.id // ASTUCE : On stocke juste l'ID cible ici maintenant, plus l'URL complète
        }
    });

    revalidatePath('/'); // Rafraîchit le Radar
}

export async function analyzeGaps() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const profile = await prisma.profile.findUnique({ where: { id: user.id } });
    if (!profile) return null;

    let missingField: 'bio' | 'role' | 'tjm' | null = null;

    if (!profile.role || profile.role === 'Nouveau' || profile.role === '') {
        missingField = 'role';
    } else if (!profile.tjm || profile.tjm === 0) {
        missingField = 'tjm';
    } else if (!profile.bio || profile.bio === '') {
        missingField = 'bio';
    }

    if (!missingField) return null;

    try {
        const prompt = `Tu es Cortex, une IA assistante. Ton but est de profiler cet utilisateur.
Son rôle actuel: ${profile.role || 'Inconnu'}
Son TJM: ${profile.tjm || 'Inconnu'}
Sa bio: ${profile.bio || 'Inconnue'}

Le champ prioritaire manquant aujourd'hui est : "${missingField}".
Pose UNE SEULE question courte, sympa et ultra directe (max 12 mots) pour obtenir cette information.`;

        const chatResponse = await mistralClient.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
        });

        const content = chatResponse.choices?.[0].message.content;
        const question = typeof content === 'string' ? content.replace(/[""]/g, '').trim() : null;

        if (question) {
            return { question, field: missingField };
        }
        return null;
    } catch (e) {
        console.error("Erreur analyzeGaps Mistral:", e);
        // Fallback
        return {
            question: missingField === 'role' ? "Quel est ton rôle ou titre actuel ?" :
                missingField === 'tjm' ? "Quel est ton Taux Journalier Moyen ?" :
                    "En quelques mots, quel est ton parcours ?",
            field: missingField
        };
    }
}
