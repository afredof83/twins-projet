/**
 * Profile Manager
 * Handles creation, management, and isolation of digital twin profiles
 */

import { PrismaClient } from '@prisma/client';
import { base64ToArray, verifyPassword } from '../crypto/zk-encryption';
import { keyManager } from '../crypto/key-manager';

const prisma = new PrismaClient();

export interface ProfileCreationData {
    name: string;
    passwordHash: string;
    saltBase64: string;
    encryptedMetadata: string;
    encryptedPhrase: string;
    vectorNamespace: string;
}

export interface ProfileCreationResult {
    profileId: string;
}

export interface DigitalTwinProfile {
    id: string;
    name: string;
    createdAt: Date;
    vectorNamespace: string;
}

export class ProfileManager {
    /**
     * Creates a new digital twin profile with Zero-Knowledge encryption
     * All cryptographic operations are performed CLIENT-SIDE
     * This method only persists pre-encrypted data
     */
    async createProfile(data: ProfileCreationData): Promise<ProfileCreationResult> {
        // Validate that we received encrypted data (basic sanity check)
        if (!data.passwordHash || !data.saltBase64 || !data.encryptedMetadata || !data.encryptedPhrase) {
            throw new Error('Missing required encrypted data fields');
        }

        // Create profile in database with pre-encrypted data
        const profile = await prisma.profile.create({
            data: {
                name: data.name,
                saltBase64: data.saltBase64,
                passwordHash: data.passwordHash,
                encryptedMetadata: data.encryptedMetadata,
                vectorNamespace: data.vectorNamespace,
            },
        });

        // Store encrypted recovery phrase
        await prisma.recoveryPhrase.create({
            data: {
                profileId: profile.id,
                encryptedPhrase: data.encryptedPhrase,
                phraseHash: data.passwordHash, // Use same hash for verification
            },
        });

        console.log(`✅ Profile created: ${profile.id} (${data.name})`);
        console.log(`📦 Vector namespace: ${data.vectorNamespace}`);
        console.log(`🔐 Zero-Knowledge: All data encrypted client-side`);

        return {
            profileId: profile.id,
        };
    }

    /**
     * Unlocks a profile with master password
     * Initializes the key manager session
     */
    async unlockProfile(profileId: string, masterPassword: string): Promise<boolean> {
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        const salt = base64ToArray(profile.saltBase64);

        // Verify password
        if (!verifyPassword(masterPassword, salt, profile.passwordHash)) {
            return false;
        }

        // Initialize session
        await keyManager.initializeSession(profileId, masterPassword, salt);

        // Update last accessed time
        await prisma.profile.update({
            where: { id: profileId },
            data: { lastAccessedAt: new Date() },
        });

        console.log(`🔓 Profile unlocked: ${profileId}`);

        return true;
    }

    /**
     * Lists all available profiles (non-sensitive data only)
     */
    async listProfiles(): Promise<DigitalTwinProfile[]> {
        const profiles = await prisma.profile.findMany({
            select: {
                id: true,
                name: true,
                createdAt: true,
                vectorNamespace: true,
            },
            orderBy: {
                lastAccessedAt: 'desc',
            },
        });

        return profiles;
    }

    /**
     * Gets the current active profile from session
     */
    getCurrentProfile(): string | null {
        const sessionInfo = keyManager.getSessionInfo();
        return sessionInfo?.profileId || null;
    }

    /**
     * Locks the current profile session
     */
    lockProfile(): void {
        keyManager.lockSession();
        console.log('🔒 Profile locked');
    }

    /**
     * Deletes a profile and all associated data
     * IRREVERSIBLE OPERATION
     */
    async deleteProfile(profileId: string, masterPassword: string): Promise<void> {
        // Verify password before deletion
        const isValid = await this.unlockProfile(profileId, masterPassword);

        if (!isValid) {
            throw new Error('Invalid password. Cannot delete profile.');
        }

        // Delete all memories (cascade will handle this via Prisma schema)
        // Delete recovery phrase
        await prisma.recoveryPhrase.deleteMany({
            where: { profileId },
        });

        // Delete profile
        await prisma.profile.delete({
            where: { id: profileId },
        });

        // Lock session
        keyManager.lockSession();

        console.log(`🗑️ Profile deleted: ${profileId}`);
    }

    /**
     * Exports profile data (encrypted) for backup
     */
    async exportProfile(profileId: string): Promise<string> {
        if (!keyManager.isSessionActive() || keyManager.getProfileId() !== profileId) {
            throw new Error('Profile must be unlocked to export');
        }

        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            include: {
                memories: true,
            },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        // Return encrypted backup
        const backup = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            profile,
        };

        return JSON.stringify(backup, null, 2);
    }
}

// Singleton instance
export const profileManager = new ProfileManager();
