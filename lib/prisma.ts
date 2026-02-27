import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    return new PrismaClient()
}

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

// On change "const prisma" par "export const prisma"
export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

// On garde l'export default par sécurité si certains fichiers l'utilisent
export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
