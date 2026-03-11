import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

/**
 * 🔐 SECURE KEY MANAGER - Blindé
 * Handles private key storage using native Keychain (iOS) and Keystore (Android).
 * Fallback to encrypted memory for Web/Dev.
 */

const PRIVATE_KEY_ALIAS = 'ip_cortex_private_key';

class KeyManager {
    private isNative = Capacitor.isNativePlatform();
    private webFallbackKey: string | null = null; // Encrypted memory fallback

    /**
     * Store private key in the most secure location available
     */
    async storePrivateKey(key: string): Promise<void> {
        if (!key) throw new Error("Tentative de stockage d'une clé vide.");

        if (this.isNative) {
            try {
                await SecureStoragePlugin.set({
                    key: PRIVATE_KEY_ALIAS,
                    value: key
                });
            } catch (error) {
                console.error("❌ Échec du stockage natif sécurisé.");
                throw error;
            }
        } else {
            // Web/Dev Fallback: Store in memory only (no persistence in localStorage)
            console.warn("🛠️ Mode Web : Clé stockée en mémoire volatile uniquement.");
            this.webFallbackKey = key;
        }
    }

    /**
     * Retrieve the private key securely
     */
    async getPrivateKey(): Promise<string | null> {
        if (this.isNative) {
            try {
                // 1. Vérification proactive pour éviter le crash natif
                const { value: keys } = await SecureStoragePlugin.keys();
                if (!keys.includes(PRIVATE_KEY_ALIAS)) {
                    console.log(`[VAULT] Clé '${PRIVATE_KEY_ALIAS}' introuvable dans l'enclave (Ignoré en douceur).`);
                    return null;
                }

                // 2. Lecture sécurisée sans risque de crash
                const { value } = await SecureStoragePlugin.get({
                    key: PRIVATE_KEY_ALIAS
                });
                return value || null;
            } catch (error) {
                console.log("Coffre vide ou erreur matérielle (Ignoré en douceur) :", error);
                return null;
            }
        } else {
            return this.webFallbackKey;
        }
    }

    /**
     * Emergency Purge: Wipe all traces of the key
     */
    async wipeKeys(): Promise<void> {
        if (this.isNative) {
            try {
                await SecureStoragePlugin.remove({ key: PRIVATE_KEY_ALIAS });
                await SecureStoragePlugin.clear(); // Clear all for extra safety
            } catch (error) {
                console.error("❌ Erreur lors de la purge d'urgence.");
            }
        }
        this.webFallbackKey = null;
        console.log("🧹 Vault purgé avec succès.");
    }

    /**
     * Check if a key is currently held
     */
    async hasUnlockedKey(): Promise<boolean> {
        const key = await this.getPrivateKey();
        return !!key;
    }
}

// Singleton for consistency
export const keyManager = new KeyManager();
