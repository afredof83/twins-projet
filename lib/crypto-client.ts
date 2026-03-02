// lib/crypto-client.ts
// Chiffrement E2E + Identité Cryptographique (BIP39 + ECDH + AES-GCM)
// "Vos données sont verrouillées par une phrase secrète que vous êtes le seul à posséder."

import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import * as bip39 from 'bip39';

const SEED_ALIAS = 'mission_control_seed_phrase';

// =====================================================
// 🧬 IDENTITÉ CRYPTOGRAPHIQUE (BIP39 + ECDH)
// =====================================================

// 1. GÉNÉRER LA SEED PHRASE ET LES CLÉS
export async function generateIdentity() {
    // A. Génération des 12 mots
    const mnemonic = bip39.generateMnemonic();

    // B. Dérivation d'une "graine" depuis les 12 mots
    const seed = await bip39.mnemonicToSeed(mnemonic);

    // C. Génération de la paire ECDH basée sur cette graine
    // (Dans un vrai flow crypto, on utiliserait HDKey, mais ici on l'utilise comme entropie)
    const keyPair = await window.crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
    );

    const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

    // D. Sauvegarde MATÉRIELLE de la clé privée
    if (Capacitor.isNativePlatform()) {
        await SecureStoragePlugin.set({ key: SEED_ALIAS, value: JSON.stringify(privateKeyJwk) });
    } else {
        localStorage.setItem(SEED_ALIAS, JSON.stringify(privateKeyJwk));
    }

    // On retourne la clé publique (pour Prisma) ET les 12 mots (à afficher à l'utilisateur 1 SEULE FOIS)
    return { publicKeyJwk, mnemonic };
}

// 2. RÉCUPÉRATION DU COFFRE-FORT
export async function getStoredPrivateKeyJwk() {
    let privateKeyString;
    if (Capacitor.isNativePlatform()) {
        const result = await SecureStoragePlugin.get({ key: SEED_ALIAS });
        privateKeyString = result.value;
    } else {
        privateKeyString = localStorage.getItem(SEED_ALIAS);
    }
    if (!privateKeyString) throw new Error("Clé introuvable. Veuillez importer votre Seed Phrase.");
    return JSON.parse(privateKeyString);
}

// 3. RESTAURATION DEPUIS LA SEED PHRASE (Si changement d'appareil)
export async function restoreFromMnemonic(mnemonic: string) {
    if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error("Phrase secrète invalide.");
    }

    // On re-dérive la graine (même processus qu'à la génération)
    const seed = await bip39.mnemonicToSeed(mnemonic);

    // Régénération de la paire de clés
    const keyPair = await window.crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
    );

    const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

    // Sauvegarde dans le coffre-fort local
    if (Capacitor.isNativePlatform()) {
        await SecureStoragePlugin.set({ key: SEED_ALIAS, value: JSON.stringify(privateKeyJwk) });
    } else {
        localStorage.setItem(SEED_ALIAS, JSON.stringify(privateKeyJwk));
    }

    return { publicKeyJwk };
}

// =====================================================
// 🔑 ECDH KEY EXCHANGE
// =====================================================

// 4. CALCULER LA CLÉ PARTAGÉE (Quand tu ouvres un chat)
export async function deriveSharedKey(otherPersonPublicKeyJwk: any): Promise<CryptoKey> {
    // 1. On sort la clé privée du coffre-fort local
    const myPrivateKeyJwk = await getStoredPrivateKeyJwk();

    // 2. Importation pour la Web Crypto API
    const privateKey = await window.crypto.subtle.importKey(
        "jwk", myPrivateKeyJwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]
    );

    const publicKey = await window.crypto.subtle.importKey(
        "jwk", otherPersonPublicKeyJwk, { name: "ECDH", namedCurve: "P-256" }, true, []
    );

    // 3. LA MAGIE MATHÉMATIQUE : Création de la clé AES-GCM commune
    const sharedKey = await window.crypto.subtle.deriveKey(
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

/**
 * Chiffre un message en clair → string formatée "iv:ciphertext" (base64).
 */
export async function encryptLocal(plaintext: string, sharedKey: CryptoKey): Promise<string> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        sharedKey,
        encoded
    );

    const ivB64 = arrayBufferToBase64(iv);
    const cipherB64 = arrayBufferToBase64(new Uint8Array(cipherBuffer));

    return `${ivB64}:${cipherB64}`;
}

// Fonction pour convertir de l'Hexa (ou Base64) en Uint8Array
const hexToBuffer = (hex: string) => new Uint8Array(hex.match(/[\da-f]{2}/gi)!.map(h => parseInt(h, 16)));

/**
 * Déchiffre un message au format "iv:ciphertext" (ou "iv:authTag:ciphertext") → texte en clair.
 */
export async function decryptLocal(encryptedPayload: string, sharedKey: CryptoKey): Promise<string> {
    try {
        // 1. On nettoie le préfixe
        const cleanPayload = encryptedPayload.replace('🧠 ', '').trim();

        if (!cleanPayload.includes(':')) {
            return encryptedPayload; // Message non chiffré
        }

        const parts = cleanPayload.split(':');
        let iv: Uint8Array;
        let cipherData: Uint8Array;

        if (parts.length === 3) {
            // Ancien format hex : iv:authTag:ciphertext
            iv = hexToBuffer(parts[0]);
            const authTag = hexToBuffer(parts[1]); // L'authTag est au milieu dans le payload fourni
            const ciphertext = hexToBuffer(parts[2]);

            // Web Crypto API attend que l'authTag soit concaténé à la fin du ciphertext
            cipherData = new Uint8Array(ciphertext.length + authTag.length);
            cipherData.set(ciphertext);
            cipherData.set(authTag, ciphertext.length);

        } else if (parts.length === 2) {
            // Nouveau format base64 : iv:ciphertext(+authTag intégré)
            iv = base64ToArrayBuffer(parts[0]);
            cipherData = base64ToArrayBuffer(parts[1]);
        } else {
            return encryptedPayload;
        }

        const decrypted = await window.crypto.subtle.decrypt(
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

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}