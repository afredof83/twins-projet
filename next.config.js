/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['@prisma/client', 'bip39'],
    images: {
        unoptimized: true, // Requis car l'optimisation d'image Next.js a besoin d'un serveur Node
    },
    async headers() {
        return [
            {
                // Applique ces headers à toutes les routes API
                source: "/api/:path*",
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "true" },
                    { key: "Access-Control-Allow-Origin", value: "*" }, // En prod, remplace "*" par tes origines exactes (ex: capacitor://localhost)
                    { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
                    { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
                ]
            }
        ]
    }
};
module.exports = nextConfig;
