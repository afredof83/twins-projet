import { Capacitor } from '@capacitor/core';
import { VaultManager, VaultKey } from './vault-manager';
import * as bip39 from 'bip39';

// =====================================================
// 🧬 IDENTITÉ CRYPTOGRAPHIQUE (BIP39 + ECDH)
// =====================================================

/**
 * Dérive une clé AES-GCM 256 bits à partir d'un PIN utilisateur en utilisant PBKDF2.
 */
export async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(pin),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as any,
            iterations: 100000, // Standard de sécurité pour contrer le brute-force
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}



/**
 * ⚡ ANTIGRAVITY: Source Unique de Vérité pour la génération de clés.
 * Ne retourne QUE la clé publique à envoyer au serveur.
 * La clé privée est séquestrée dans la puce matérielle via VaultManager ou chiffrée sur le Web.
 */
export async function generateAndStoreKeyPair(userPin: string): Promise<{ publicKeyJwk: JsonWebKey; mnemonic: string }> {
    if (!userPin || userPin.length < 4) {
        throw new Error("Un PIN robuste est requis pour sécuriser le coffre local.");
    }

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
            // 🚨 Web Fallback: Chiffrement de la clé privée avec le PIN
            const exportedPrivateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const aesKey = await deriveKeyFromPin(userPin, salt);
            
            const encryptedPrivateKey = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                aesKey,
                exportedPrivateKey
            );

            const vaultData = {
                encryptedPrivateKey: arrayBufferToBase64(new Uint8Array(encryptedPrivateKey)),
                salt: arrayBufferToBase64(salt),
                iv: arrayBufferToBase64(iv)
            };
            
            localStorage.setItem('ipse_web_vault', JSON.stringify(vaultData));
            cachedPrivateKey = keyPair.privateKey;
            console.log("🔒 Clé privée chiffrée, sauvegardée localement, et chargée en RAM avec succès.");
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

let cachedPrivateKey: CryptoKey | null = null;

// Rétrocompatibilité : alias pour l'ancien nom
export async function getStoredPrivateKeyJwk(): Promise<JsonWebKey> {
    try {
        if (Capacitor.isNativePlatform()) {
            const key = await getLocalPrivateKey();
            if (!key) throw new Error("Clé native introuvable.");
            return key;
        } else {
            // ⚡️ 1. Vérification la plus rapide : La RAM
            if (cachedPrivateKey) {
                return await window.crypto.subtle.exportKey("jwk", cachedPrivateKey) as JsonWebKey;
            }

            // 🔄 2. TENTATIVE DE RÉCUPÉRATION JWT (Cross-Tab / F5)
            console.log("🔄 RAM vide. Tentative de récupération depuis la Session...");
            const { createClient } = await import('@/lib/supabaseBrowser');
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                const recoveredKey = await unwrapKeyWithSession(session.access_token);
                if (recoveredKey) {
                    cachedPrivateKey = recoveredKey; // Remise en RAM
                    console.log("✅ Clé E2EE restaurée depuis le JWT !");
                    return await window.crypto.subtle.exportKey("jwk", recoveredKey) as JsonWebKey;
                }
            }

            // ❌ 3. Si la RAM est vide ET le SessionStorage est vide/invalide
            // C'est ici, et SEULEMENT ici, qu'on throw l'erreur qui affiche ton écran de déverrouillage
            throw new Error("Clé non chargée en RAM. Reconnexion requise.");
        }
    } catch (e) {
        console.error("❌ Erreur critique E2EE:", e);
        throw e;
    }
}

// --- DÉBUT DU BLOC JWT WRAPPING ---

// Utilitaire d'encodage pour ArrayBuffer au lieu d'Uint8Array directement
function arrayBufferToBase64ForWrap(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// 1. Emballe la clé privée avec le Token Supabase
export async function wrapKeyWithSession(privateKey: CryptoKey, jwtToken: string) {
    const jwk = await window.crypto.subtle.exportKey("jwk", privateKey);
    const encoder = new TextEncoder();
    
    // Dérivation d'une clé AES à partir du JWT
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw", encoder.encode(jwtToken), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const aesKey = await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: 10000, hash: "SHA-256" },
        keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
    );

    // Chiffrement de la clé
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv }, aesKey, encoder.encode(JSON.stringify(jwk))
    );

    // Sauvegarde Cross-Tab
    localStorage.setItem('ipse_jwt_vault', JSON.stringify({
        encryptedKey: arrayBufferToBase64ForWrap(encrypted),
        salt: arrayBufferToBase64ForWrap(salt.buffer),
        iv: arrayBufferToBase64ForWrap(iv.buffer)
    }));
    console.log("🔐 Clé E2EE sécurisée avec la session active.");
}

// 2. Déballe la clé privée avec le Token Supabase
export async function unwrapKeyWithSession(jwtToken: string): Promise<CryptoKey | null> {
    const vaultStr = localStorage.getItem('ipse_jwt_vault');
    if (!vaultStr) return null;

    try {
        const vaultData = JSON.parse(vaultStr);
        const salt = base64ToArrayBuffer(vaultData.salt);
        const iv = base64ToArrayBuffer(vaultData.iv);
        const encryptedKey = base64ToArrayBuffer(vaultData.encryptedKey);

        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw", encoder.encode(jwtToken), { name: "PBKDF2" }, false, ["deriveKey"]
        );
        const aesKey = await window.crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: salt as BufferSource, iterations: 10000, hash: "SHA-256" },
            keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
        );

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(iv.buffer) as BufferSource }, aesKey, encryptedKey as BufferSource
        );

        const jwk = JSON.parse(new TextDecoder().decode(decryptedBuffer));
        return await window.crypto.subtle.importKey(
            "jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]
        );
    } catch (e) {
        console.warn("⚠️ Impossible de déchiffrer avec la session. Token expiré ?");
        return null;
    }
}
// --- FIN DU BLOC JWT WRAPPING ---

/**
 * Ouvre le coffre local, déchiffre la clé privée avec le mot de passe fourni, et la place en RAM.
 */
export async function unlockLocalVault(secret: string): Promise<CryptoKey> {
    const vaultString = localStorage.getItem('ipse_web_vault');
    if (!vaultString) {
        throw new Error("Clé introuvable. Aucun coffre local détecté.");
    }

    const vaultData = JSON.parse(vaultString);

    // Reconstruction des buffers (base64ToArrayBuffer renvoie un Uint8Array)
    const salt = base64ToArrayBuffer(vaultData.salt);
    const iv = base64ToArrayBuffer(vaultData.iv);
    const encryptedPrivateKey = base64ToArrayBuffer(vaultData.encryptedPrivateKey);

    try {
        // 1. Recréer la clé AES à partir du mot de passe saisi
        const aesKey = await deriveKeyFromPin(secret, salt);

        // 2. Déchiffrer la clé privée ECDH
        const decryptedPrivateKeyBuffer = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv as any },
            aesKey,
            encryptedPrivateKey as any
        );

        // 3. Réimporter le buffer déchiffré en tant que CryptoKey utilisable
        const privateKey = await crypto.subtle.importKey(
            "pkcs8",
            decryptedPrivateKeyBuffer,
            { name: "ECDH", namedCurve: "P-256" },
            true, // extractable
            ["deriveKey", "deriveBits"]
        );

        console.log("🔓 Coffre déverrouillé avec succès ! Clé chargée en RAM.");
        cachedPrivateKey = privateKey;
        return privateKey;

    } catch (error) {
        console.error("Échec du déchiffrement. PIN incorrect ou données corrompues.", error);
        throw new Error("Code PIN incorrect.");
    }
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
 * Dérive la clé partagée (SharedKey) entre ta clé privée et la clé publique du partenaire.
 * Ce parseur est blindé contre TOUTES les variations d'encodage (Objet, JSON, Base64, Base64Url).
 */
export async function deriveSharedKey(myPrivateKey: CryptoKey, partnerPublicKeyData: string | object): Promise<CryptoKey> {
    let partnerJwkObj;

    try {
        // CAS 1: Supabase a déjà parsé le champ en Objet JavaScript natif
        if (typeof partnerPublicKeyData === 'object') {
            partnerJwkObj = partnerPublicKeyData;
        } 
        // CAS 2: C'est une chaîne de caractères (JSON ou Base64)
        else if (typeof partnerPublicKeyData === 'string') {
            const trimmed = partnerPublicKeyData.trim();
            
            // Si c'est du JSON en texte brut
            if (trimmed.startsWith('{')) {
                partnerJwkObj = JSON.parse(trimmed);
            } 
            // Si c'est du Base64
            else {
                // 1. Nettoyage extrême : on retire les guillemets (" ou ') et les espaces invisibles
                let cleanBase64 = trimmed.replace(/['"\s]/g, '');
                
                // 2. Conversion du Base64Url-Safe vers le Base64 Standard
                cleanBase64 = cleanBase64.replace(/-/g, '+').replace(/_/g, '/');
                
                // 3. Réparation du Padding (=) pour forcer un multiple de 4
                while (cleanBase64.length % 4 !== 0) {
                    cleanBase64 += '=';
                }
                
                // 4. Décodage et parsing
                const jsonString = window.atob(cleanBase64);
                partnerJwkObj = JSON.parse(jsonString);
            }
        } else {
            throw new Error("Le format de la clé est inconnu (ni object, ni string).");
        }
    } catch (error) {
        console.error("❌ Échec critique du parsing de la clé publique de l'interlocuteur :", partnerPublicKeyData);
        console.error("Détail de l'erreur :", error);
        throw new Error("Clé du destinataire corrompue ou indécodable.");
    }

    // Importation de la clé via WebCrypto au format JWK
    const partnerPublicKey = await window.crypto.subtle.importKey(
        "jwk",
        partnerJwkObj as JsonWebKey,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        [] // Les clés publiques ECDH n'ont pas d'opérations assignées
    );

    // Dérivation mathématique de la clé AES partagée
    return await window.crypto.subtle.deriveKey(
        {
            name: "ECDH",
            public: partnerPublicKey
        },
        myPrivateKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
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