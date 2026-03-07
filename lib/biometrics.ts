import { NativeBiometric } from 'capacitor-native-biometric';

export const performBiometricVaultUnlock = async (): Promise<boolean> => {
    try {
        // 1. Vérifier si la biométrie est disponible sur ce téléphone
        const result = await NativeBiometric.isAvailable();

        if (!result.isAvailable) {
            console.warn("Biométrie non disponible. Passage en mode dégradé (code secret uniquement).");
            return false;
        }

        // 2. Lancer le scan (Empreinte ou Visage selon le téléphone)
        await NativeBiometric.verifyIdentity({
            reason: "Accès à l'Agent Ipse - Déchiffrement du MasterKey",
            title: "Identité requise",
            subtitle: "Veuillez vous authentifier pour ouvrir le coffre-fort local",
            description: "Votre clé de chiffrement reste protégée dans l'enclave sécurisée.",
            negativeButtonText: "Annuler",
        });

        return true;
    } catch (error) {
        console.error("Échec de l'authentification biométrique :", error);
        return false;
    }
};
