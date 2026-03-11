import { Capacitor } from '@capacitor/core';
import { VaultManager, VaultKey } from './vault-manager';
import * as bip39 from 'bip39';

// =====================================================
// 🧬 IDENTITÉ CRYPTOGRAPHIQUE (BIP39 + ECDH)
// =====================================================

/**
 * ⚡ ANTIGRAVITY: Source Unique de Vérité pour la génération de clés.
 * Ne retourne QUE la clé publique à envoyer au serveur.
 * La clé privée est séquestrée dans la puce matérielle via VaultManager.
 */
export async function generateAndStoreKeyPair(): Promise<{ publicKeyJwk: JsonWebKey; mnemonic: string }> {
    try {
        // A. Génération des 12 mots
        const mnemonic = bip39.generateMnemonic();

        // B. Génération Mathématique de la paire ECDH
        const keyPair = await crypto.subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            true,
            ["deriveKey", "deriveBits"]
        );

        const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey) as JsonWebKey;
        const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey) as JsonWebKey;

        // C. Le Bouclier Matériel (Zero-Tolerance)
        if (Capacitor.isNativePlatform()) {
            await VaultManager.saveSecret(VaultKey.IDENTITY_PRIVATE, JSON.stringify(privateKeyJwk));
            await VaultManager.saveSecret(VaultKey.IDENTITY_PUBLIC, JSON.stringify(publicKeyJwk));
            console.log("✅ [CRYPTO] Clé privée verrouillée dans le Keystore/Keychain natif via VaultManager.");
        } else {
            // 🚨 Arrêt d'urgence. On ne stocke RIEN en clair.
            throw new Error("SECURITY_HALT: Environnement non sécurisé détecté. Le stockage de clé en clair est interdit.");
        }

        // D. On ne renvoie que ce qui est publiable
        return { publicKeyJwk, mnemonic };

    } catch (error: any) {
        console.error("❌ [CRYPTO FATAL ERROR]:", error.message);
        throw error;
    }
}

// Rétrocompatibilité : alias pour l'ancien nom
export const generateIdentity = generateAndStoreKeyPair;

/**
 * ⚡ ANTIGRAVITY: Lecture exclusive depuis la puce sécurisée.
 */
export async function getLocalPrivateKey(): Promise<JsonWebKey | null> {
    const value = await VaultManager.loadSecret(VaultKey.IDENTITY_PRIVATE);
    if (value) {
        return JSON.parse(value) as JsonWebKey;
    }
    return null;
}

// Rétrocompatibilité : alias pour l'ancien nom
export async function getStoredPrivateKeyJwk(): Promise<JsonWebKey> {
    const key = await getLocalPrivateKey();
    if (!key) throw new Error("Clé introuvable. Veuillez importer votre Seed Phrase.");
    return key;
}

/**
 * Restauration depuis la Phrase Secrète (BIP39).
 */
export async function restoreFromMnemonic(mnemonic: string): Promise<{ publicKeyJwk: JsonWebKey }> {
    if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error("Phrase secrète invalide.");
    }

    const keyPair = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
    );

    const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey) as JsonWebKey;
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey) as JsonWebKey;

    if (Capacitor.isNativePlatform()) {
        await VaultManager.saveSecret(VaultKey.IDENTITY_PRIVATE, JSON.stringify(privateKeyJwk));
        await VaultManager.saveSecret(VaultKey.IDENTITY_PUBLIC, JSON.stringify(publicKeyJwk));
        console.log("✅ [CRYPTO] Clé privée restaurée dans le Keystore/Keychain via VaultManager.");
    } else {
        throw new Error("SECURITY_HALT: Environnement non sécurisé détecté.");
    }

    return { publicKeyJwk };
}

// =====================================================
// 🔑 ECDH KEY EXCHANGE
// =====================================================

/**
 * Calculer la clé partagée AES-GCM (quand tu ouvres un chat).
 */
export async function deriveSharedKey(otherPersonPublicKeyJwk: any): Promise<CryptoKey> {
    const myPrivateKeyJwk = await getStoredPrivateKeyJwk();

    const privateKey = await crypto.subtle.importKey(
        "jwk", myPrivateKeyJwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]
    );

    const publicKey = await crypto.subtle.importKey(
        "jwk", otherPersonPublicKeyJwk, { name: "ECDH", namedCurve: "P-256" }, true, []
    );

    const sharedKey = await crypto.subtle.deriveKey(
        { name: "ECDH", public: publicKey },
        privateKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    return sharedKey;
}

// =====================================================
// 🔒 CHIFFREMENT / DÉCHIFFREMENT AES-GCM
// =====================================================

export async function encryptLocal(plaintext: string, sharedKey: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const cipherBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        sharedKey,
        encoded
    );

    const ivB64 = arrayBufferToBase64(iv);
    const cipherB64 = arrayBufferToBase64(new Uint8Array(cipherBuffer));

    return `${ivB64}:${cipherB64}`;
}

const hexToBuffer = (hex: string) => new Uint8Array(hex.match(/[\da-f]{2}/gi)!.map(h => parseInt(h, 16)));

export async function decryptLocal(encryptedPayload: string, sharedKey: CryptoKey): Promise<string> {
    try {
        const cleanPayload = encryptedPayload.replace('🧠 ', '').trim();

        if (!cleanPayload.includes(':')) {
            return encryptedPayload;
        }

        const parts = cleanPayload.split(':');
        let iv: Uint8Array;
        let cipherData: Uint8Array;

        if (parts.length === 3) {
            iv = hexToBuffer(parts[0]);
            const authTag = hexToBuffer(parts[1]);
            const ciphertext = hexToBuffer(parts[2]);
            cipherData = new Uint8Array(ciphertext.length + authTag.length);
            cipherData.set(ciphertext);
            cipherData.set(authTag, ciphertext.length);
        } else if (parts.length === 2) {
            iv = base64ToArrayBuffer(parts[0]);
            cipherData = base64ToArrayBuffer(parts[1]);
        } else {
            return encryptedPayload;
        }

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv as BufferSource },
            sharedKey,
            cipherData as BufferSource
        );

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.error("Échec déchiffrement:", e);
        return "🔒 Message chiffré illisible";
    }
}

// =====================================================
// 🛠️ UTILITAIRES
// =====================================================

function arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}