/** @type {import('next').NextConfig} */
const nextConfig = {
    telemetry: false,
    serverExternalPackages: ['@prisma/client', 'pdf2json', 'bip39'],
};
module.exports = nextConfig;

// trigger fix build
