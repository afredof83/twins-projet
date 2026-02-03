// Fix build dependencies Vercel
/**
 * Zero-Knowledge Encryption Module
 * 
 * Implements AES-256-GCM encryption with PBKDF2 key derivation.
 * All encryption happens client-side. The server never sees the encryption key.
 */

import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 32;
const IV_LENGTH = 12; // GCM standard IV length
const KEY_LENGTH = 32; // 256 bits

/**
 * Derives an encryption key from a master password using PBKDF2
 */
export async function deriveKey(
  masterPassword: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Use PBKDF2 to derive key material
  const keyMaterial = pbkdf2(sha256, masterPassword, salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: KEY_LENGTH,
  });

  // Import the key material as a CryptoKey for Web Crypto API
  // Create a new Uint8Array to ensure proper ArrayBuffer type
  return await crypto.subtle.importKey(
    'raw',
    new Uint8Array(keyMaterial),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generates a cryptographically secure random salt
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generates a cryptographically secure random IV
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Encrypts data using AES-256-GCM
 * 
 * @param data - The plaintext data to encrypt
 * @param key - The encryption key (derived from master password)
 * @returns Encrypted data with IV prepended (IV + ciphertext + auth tag)
 */
export async function encrypt(
  data: string,
  key: CryptoKey
): Promise<string> {
  const iv = generateIV();
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Encrypt using AES-GCM (includes authentication tag)
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv),
    },
    key,
    dataBuffer
  );

  // Combine IV + encrypted data for storage
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);

  // Return as base64 for easy storage
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

/**
 * Decrypts data encrypted with AES-256-GCM
 * 
 * @param encryptedData - Base64 encoded encrypted data (IV + ciphertext + auth tag)
 * @param key - The decryption key (same as encryption key)
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong key or tampered data)
 */
export async function decrypt(
  encryptedData: string,
  key: CryptoKey
): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encryptedBuffer = combined.slice(IV_LENGTH);

    // Decrypt using AES-GCM (verifies authentication tag)
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
      },
      key,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    throw new Error('Decryption failed: Invalid key or corrupted data');
  }
}

/**
 * Hashes a master password to create a verification hash
 * This hash is stored in the database to verify the password without storing the key
 */
export function hashPassword(password: string, salt: Uint8Array): string {
  const hash = pbkdf2(sha256, password, salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: 32,
  });
  return btoa(String.fromCharCode.apply(null, Array.from(hash)));
}

/**
 * Verifies a password against a stored hash
 */
export function verifyPassword(
  password: string,
  salt: Uint8Array,
  storedHash: string
): boolean {
  const computedHash = hashPassword(password, salt);
  return computedHash === storedHash;
}

/**
 * Encrypts an object by converting it to JSON first
 */
export async function encryptObject<T>(
  obj: T,
  key: CryptoKey
): Promise<string> {
  const json = JSON.stringify(obj);
  return await encrypt(json, key);
}

/**
 * Decrypts an encrypted object
 */
export async function decryptObject<T>(
  encryptedData: string,
  key: CryptoKey
): Promise<T> {
  const json = await decrypt(encryptedData, key);
  return JSON.parse(json) as T;
}

/**
 * Converts a Uint8Array to a base64 string for storage
 */
export function arrayToBase64(array: Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, Array.from(array)));
}

/**
 * Converts a base64 string back to a Uint8Array
 */
export function base64ToArray(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}
