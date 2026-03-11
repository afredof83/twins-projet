import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { NativeBiometric } from 'capacitor-native-biometric';

/**
 * 🔒 VAULT MANAGER
 * Centralized security layer for native hardware-protected key storage.
 * Ensures private keys never touch localStorage or non-secure memory.
 */

export enum VaultKey {
    MASTER_KEY = 'master_key_secret',
    IDENTITY_PRIVATE = 'ipse_private_key',
    IDENTITY_PUBLIC = 'ipse_public_key'
}

export const VaultManager = {
    /**
     * 🔐 Save a sensitive secret to the native Keystore (Android) or Keychain (iOS).
     */
    async saveSecret(key: VaultKey, value: string): Promise<void> {
        if (!Capacitor.isNativePlatform()) {
            console.warn(`⚠️ [VAULT] Platform non-native. Le stockage de ${key} est simulé (NON SÉCURISÉ).`);
            // En dev/web, on pourrait utiliser SessionStorage ou autre, mais ici on reste strict.
            return;
        }

        await SecureStoragePlugin.set({ key, value });
        console.log(`✅ [VAULT] Secret '${key}' verrouillé dans l'enclave matérielle.`);
    },

    /**
     * 🔓 Load a secret from the vault.
     */
    async loadSecret(key: VaultKey): Promise<string | null> {
        if (!Capacitor.isNativePlatform()) return null;

        try {
            // 1. Vérification proactive pour éviter le crash natif
            const { value: keys } = await SecureStoragePlugin.keys();
            if (!keys.includes(key)) {
                console.log(`[VAULT] Clé '${key}' introuvable dans l'enclave (Ignoré en douceur).`);
                return null;
            }

            // 2. Lecture sécurisée sans risque de crash
            const result = await SecureStoragePlugin.get({ key });
            return result.value || null;
        } catch (error) {
            console.log("Coffre vide ou erreur matérielle (Ignoré en douceur) :", error);
            return null;
        }
    },

    /**
     * 🧬 Unlock and Load: Combined Biometric Challenge + Vault Retrieval.
     * Use this whenever highly sensitive keys are needed.
     */
    async unlockAndLoad(key: VaultKey, reason: string = "Accès sécurisé requis"): Promise<string | null> {
        try {
            // 1. Biometric Challenge
            const available = await NativeBiometric.isAvailable();
            if (available.isAvailable) {
                await NativeBiometric.verifyIdentity({
                    reason,
                    title: "Authentification Cyber-Sécurité",
                    subtitle: "Déverrouillage de l'enclave biométrique",
                    description: "Accès requis pour le déchiffrement des données.",
                    negativeButtonText: "Annuler"
                });
            } else {
                console.warn("⚠️ Biométrie indisponible. Tentative de lecture directe (Mode dégradé).");
            }

            // 2. Retrieval
            return await this.loadSecret(key);
        } catch (error) {
            console.error("❌ [VAULT] Échec du déverrouillage :", error);
            throw new Error("Authentification échouée. Accès au coffre-fort refusé.");
        }
    },

    /**
     * 🧹 Emergency Purge: Wipe ALL keys from the vault.
     * To be called on logout or security breach detection.
     */
    async wipeKeys(): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;

        try {
            const keys = Object.values(VaultKey);
            for (const key of keys) {
                await SecureStoragePlugin.remove({ key });
            }
            console.log("🧨 [VAULT] Purge d'urgence effectuée. Toutes les clés supprimées.");
        } catch (error) {
            console.error("❌ [VAULT] Erreur lors de la purge :", error);
        }
    }
};
