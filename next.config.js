/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['@prisma/client', 'bip39'],
};
module.exports = nextConfig;

// trigger fix build
