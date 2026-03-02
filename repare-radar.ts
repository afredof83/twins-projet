import { PrismaClient } from './generated/prisma/client';
const prisma = new PrismaClient();

async function main() {
    const profileId = "28de7876-17a4-4648-8f78-544dcea980f1";

    console.log("🚀 Tentative de création du Radar pour le profil:", profileId);

    // 1. On vérifie si le profil existe vraiment dans la DB que Prisma voit
    const profile = await prisma.profile.findUnique({ where: { id: profileId } });

    if (!profile) {
        throw new Error(`Le profil ${profileId} n'existe pas dans cette base de données !`);
    }

    // 2. On nettoie les anciens radars pour cet utilisateur
    await prisma.radar.deleteMany({ where: { profileId } });

    // 3. On crée le nouveau radar
    const radar = await prisma.radar.create({
        data: {
            profileId: profileId,
            theme: "BUSINESS",
            customPrompt: "Recherche de startups en IA créées ce mois-ci",
            frequency: 24,
            isActive: true,
            lastRunAt: new Date(2020, 0, 1) // Forcer le scan immédiat
        }
    });

    console.log("✅ SUCCÈS : Radar créé avec l'ID :", radar.id);
}

main()
    .catch((e) => {
        console.error("❌ ERREUR :");
        console.error(e.message);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
