// lib/security/crypto.ts

// Pour faire simple dans ce prototype, on va dériver une clé à partir d'un mot de passe fixe
// Dans une version prod, ce mot de passe serait demandé à l'utilisateur à chaque session.
const MASTER_KEY_PASSWORD = "MON_SECRET_TRES_SECURISE_123";

async function getKey() {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(MASTER_KEY_PASSWORD),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode("salt_fixe_pour_proto"), // À randomiser en prod
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

export const cryptoManager = {
    // CHIFFRER (Texte -> Charabia)
    async encrypt(text: string): Promise<string> {
        const key = await getKey();
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(text);

        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encoded
        );

        // On combine IV + Texte chiffré pour le stockage
        const ivArray = Array.from(iv);
        const encryptedArray = Array.from(new Uint8Array(encrypted));
        return JSON.stringify({ iv: ivArray, data: encryptedArray });
    },

    // DÉCHIFFRER (Charabia -> Texte)
    async decrypt(cipherText: string): Promise<string> {
        try {
            const { iv, data } = JSON.parse(cipherText);
            const key = await getKey();

            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: new Uint8Array(iv) },
                key,
                new Uint8Array(data)
            );

            return new TextDecoder().decode(decrypted);
        } catch (e) {
            return "🔒 [Contenu Verrouillé - Clé invalide]";
        }
    }
};
