import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const prismaClientSingleton = () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    return new PrismaClient({ adapter })
}

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

// On change "const prisma" par "export const prisma"
export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

// On garde l'export default par sécurité si certains fichiers l'utilisent
export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
