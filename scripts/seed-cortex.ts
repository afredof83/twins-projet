import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding CORTEX_SYSTEM profile...");

    await prisma.profile.upsert({
        where: { id: 'CORTEX_SYSTEM' },
        update: {},
        create: {
            id: 'CORTEX_SYSTEM',
            email: 'cortex@system.local',
            name: 'CORTEX AI',
            role: 'SYSTEM_AGENT',
            bio: 'Intelligence centrale du réseau de Jumeaux Numériques.'
        }
    });

    console.log("Seeding complete. CORTEX_SYSTEM is ready.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
