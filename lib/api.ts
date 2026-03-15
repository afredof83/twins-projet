import { Capacitor } from '@capacitor/core';

/**
 * Secure Network Layer - getApiUrl
 * Supports both Local Web Dev and Native Headless APK builds.
 */
export function getApiUrl(path: string): string {
    // If on a browser (Web), return the relative path (Internal Next.js routing)
    if (!Capacitor.isNativePlatform()) {
        return path;
    }

    // If on Native (APK/Emulator), use the absolute Remote URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.22:3000';
    
    return `${baseUrl}${path}`;
}
