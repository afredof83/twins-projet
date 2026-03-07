import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { useKeyStore } from '@/store/keyStore';
import { LOCAL_SCHEMA } from './schema';

const sqlite = new SQLiteConnection(CapacitorSQLite);

// ⚡ LE SINGLETON : Il garde la base de données active en mémoire
let dbInstance: SQLiteDBConnection | null = null;

export const initLocalDatabase = async () => {
    try {
        const secretKey = useKeyStore.getState().masterKey;
        if (!secretKey) throw new Error("Accès refusé : Clé biométrique manquante.");

        const db = await sqlite.createConnection(
            'ipse_twin_db',
            false,
            'no-encryption', // À remplacer par 'encryption' avec le secret en prod
            1,
            false
        );

        await db.open();
        await db.execute(LOCAL_SCHEMA);

        // On sauvegarde la connexion pour le reste de l'application
        dbInstance = db;

        console.log("🟢 Bunker Local Initialisé");
        return db;
    } catch (error) {
        console.error("🔴 Échec de l'initialisation locale", error);
        throw error;
    }
};

// ⚡ L'EXTRACTEUR : Utilisé par ton Sync Engine pour faire des requêtes
export const getLocalDb = (): SQLiteDBConnection => {
    if (!dbInstance) {
        throw new Error("FATAL: Tentative d'accès à la DB locale avant son initialisation par le Gatekeeper.");
    }
    return dbInstance;
};