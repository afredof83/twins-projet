import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// Verify if ENCRYPTION_KEY is set and 32 bytes (64 hex characters)
// For dev without this env, fallback to a dummy key (only for dev, NEVER for production)
const getEncryptionKey = () => {
    if (process.env.ENCRYPTION_KEY) {
        return Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    }
    console.warn("WARNING: ENCRYPTION_KEY is not set in environment. Using a default insecure key for development.");
    return Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'); // 32 bytes of zeros
};

const KEY = getEncryptionKey();

export function encryptMessage(text: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptMessage(encryptedData: string) {
    try {
        if (!encryptedData.includes(':')) {
            // Unencrypted message from before the encryption era, return as is
            return encryptedData;
        }

        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            return encryptedData; // Malformed encrypted string?
        }

        const [ivHex, authTagHex, encryptedText] = parts;
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error("Failed to decrypt message:", e, encryptedData);
        return "🔒 Message chiffré illisible";
    }
}
