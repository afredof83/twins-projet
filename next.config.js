/** @type {import('next').NextConfig} */
const nextConfig = {
    telemetry: false,
    experimental: {
        serverComponentsExternalPackages: ['@prisma/client', 'pdf2json', 'bip39'],
    },
};
module.exports = nextConfig;
