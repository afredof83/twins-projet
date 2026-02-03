/**
 * Key Manager - Secure Session-Based Key Storage
 * 
 * Manages encryption keys in memory during a user session.
 * Keys are never persisted to disk or localStorage.
 */

import { deriveKey, generateSalt, arrayToBase64, base64ToArray } from './zk-encryption';

interface KeySession {
    masterKey: CryptoKey;
    profileId: string;
    salt: Uint8Array;
    createdAt: number;
    lastAccessedAt: number;
}

class KeyManager {
    private session: KeySession | null = null;
    private readonly AUTO_LOCK_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    /**
     * Initializes a new key session from a master password
     */
    async initializeSession(
        profileId: string,
        masterPassword: string,
        salt: Uint8Array
    ): Promise<void> {
        const masterKey = await deriveKey(masterPassword, salt);

        this.session = {
            masterKey,
            profileId,
            salt,
            createdAt: Date.now(),
            lastAccessedAt: Date.now(),
        };
    }

    /**
     * Gets the current master key
     * @throws Error if session is not initialized or expired
     */
    getMasterKey(): CryptoKey {
        this.checkSession();
        this.session!.lastAccessedAt = Date.now();
        return this.session!.masterKey;
    }

    /**
     * Gets the current profile ID
     */
    getProfileId(): string {
        this.checkSession();
        return this.session!.profileId;
    }

    /**
     * Gets the salt for the current session
     */
    getSalt(): Uint8Array {
        this.checkSession();
        return this.session!.salt;
    }

    /**
     * Checks if a session is active and not expired
     */
    isSessionActive(): boolean {
        if (!this.session) return false;

        const timeSinceLastAccess = Date.now() - this.session.lastAccessedAt;
        if (timeSinceLastAccess > this.AUTO_LOCK_TIMEOUT) {
            this.lockSession();
            return false;
        }

        return true;
    }

    /**
     * Locks the current session (clears keys from memory)
     */
    lockSession(): void {
        this.session = null;
    }

    /**
     * Derives a specialized key for a specific purpose
     * This allows different keys for data encryption, embeddings, etc.
     */
    async deriveSpecializedKey(purpose: string): Promise<CryptoKey> {
        this.checkSession();

        // Create a unique salt by combining the session salt with the purpose
        const purposeBuffer = new TextEncoder().encode(purpose);
        const combinedSalt = new Uint8Array(this.session!.salt.length + purposeBuffer.length);
        combinedSalt.set(this.session!.salt, 0);
        combinedSalt.set(purposeBuffer, this.session!.salt.length);

        // Derive a new key using the combined salt
        const specializedKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: combinedSalt,
                iterations: 100000,
                hash: 'SHA-256',
            },
            this.session!.masterKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        return specializedKey;
    }

    /**
     * Checks if session is valid, throws if not
     */
    private checkSession(): void {
        if (!this.isSessionActive()) {
            throw new Error('Session expired or not initialized. Please unlock your profile.');
        }
    }

    /**
     * Gets session info (without exposing the key)
     */
    getSessionInfo(): { profileId: string; createdAt: number; lastAccessedAt: number } | null {
        if (!this.session) return null;

        return {
            profileId: this.session.profileId,
            createdAt: this.session.createdAt,
            lastAccessedAt: this.session.lastAccessedAt,
        };
    }
}

// Singleton instance
export const keyManager = new KeyManager();
