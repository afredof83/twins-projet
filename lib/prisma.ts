import { PrismaClient } from '../generated/prisma/client';
import { Pool } from 'pg'; // Requis pour l'adapter-pg
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
    // CORRECTION DU BUG : PrismaPg prend un Pool pg, pas un objet de config brut
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
}

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;

/**
 * ⚡ LE GARDIEN DU RLS ⚡
 * Utilise cette fonction dans TOUTES tes routes API (au lieu du prisma standard)
 * Elle force Prisma à se comporter comme l'utilisateur authentifié.
 */
export const getPrismaForUser = (userId: string) => {
    return prisma.$extends({
        query: {
            $allModels: {
                async $allOperations({ args, query }) {
                    // On enveloppe la requête dans une transaction interactive locale
                    const [, result] = await prisma.$transaction([
                        // 1. On injecte le JWT de l'utilisateur dans le contexte Postgres
                        // ⚡ CORRECTION : Ajout de ::text après ${userId} pour forcer le typage Postgres
                        prisma.$executeRaw`
              SELECT set_config('role', 'authenticated', true), 
                     set_config('request.jwt.claims', json_build_object('sub', ${userId}::text)::text, true);
            `,
                        // 2. On exécute la requête Prisma (qui est maintenant soumise au RLS)
                        query(args),
                    ]);
                    return result;
                },
            },
        },
    });
};