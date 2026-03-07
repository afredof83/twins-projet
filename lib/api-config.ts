/**
 * Helper to construct absolute API URLs for mobile builds.
 * In a static export (Capacitor), relative URLs like /api/... won't work.
 */
export const getApiUrl = (path: string) => {
    // NEXT_PUBLIC_API_URL should be set to your production deployment URL (e.g., https://your-app.vercel.app)
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

    // If it's already an absolute URL, return as is
    if (path.startsWith('http')) return path;

    // Prepend baseUrl if it exists and path is relative
    if (baseUrl && path.startsWith('/')) {
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return `${cleanBase}${path}`;
    }

    return path;
};
