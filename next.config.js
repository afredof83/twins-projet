/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['@prisma/client', 'bip39'],
    images: {
        unoptimized: true, 
    },
};
module.exports = nextConfig;
