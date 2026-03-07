import { Network } from '@capacitor/network';
import { getApiUrl } from '../api-config';
import { createClient } from '../supabaseBrowser';
// ⚡ Correction du chemin relatif
import { getLocalDb } from '../local-db/init';

export const performAction = async (endpoint: string, method: string, payload: any) => {
    const status = await Network.getStatus();

    if (status.connected) {
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const response = await fetch(getApiUrl(endpoint), {
                method,
                headers,
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (e) {
            return await queueMutation(endpoint, method, payload);
        }
    } else {
        console.warn("Réseau indisponible. Action mise en cache tactique.");
        return await queueMutation(endpoint, method, payload);
    }
};

const queueMutation = async (endpoint: string, method: string, payload: any) => {
    // ⚡ On récupère l'instance chiffrée
    const db = await getLocalDb();
    const id = crypto.randomUUID();

    const query = `INSERT INTO mutation_queue (id, endpoint, method, payload, createdAt) VALUES (?, ?, ?, ?, ?)`;

    await db.run(query, [id, endpoint, method, JSON.stringify(payload), new Date().toISOString()]);

    return { success: true, offline: true, message: "Action sauvegardée localement." };
};

// 🔄 BOUCLE DE RÉSURRECTION (Background Sync)
// Exportée pour pouvoir être appelée lors du (re)démarrage de l'app ou dans un composant racine (ex: App.tsx / Layout)
export const setupBackgroundSync = () => {
    Network.addListener('networkStatusChange', async (status) => {
        if (status.connected) {
            console.log("🌐 Réseau rétabli. Vidage de la Mutation Queue...");
            await flushMutationQueue();
        }
    });
};

export const flushMutationQueue = async () => {
    try {
        const db = await getLocalDb();

        // 1. SELECT * FROM mutation_queue WHERE status = 'PENDING'
        const result = await db.query("SELECT * FROM mutation_queue WHERE status = 'PENDING' ORDER BY createdAt ASC");
        const actions = result.values || [];

        if (actions.length === 0) return;

        console.log(`📡 Trouvé ${actions.length} action(s) en attente. Tentative de synchronisation...`);

        // 2. Pour chaque ligne : fetch(ligne.endpoint, { method: ligne.method, body: ligne.payload })
        for (const action of actions) {
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                const headers: any = { 'Content-Type': 'application/json' };
                if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

                const response = await fetch(getApiUrl(action.endpoint), {
                    method: action.method,
                    headers,
                    body: action.payload // c'est déjà une string JSON
                });

                if (response.ok) {
                    // 3. Si succès : UPDATE mutation_queue SET status = 'SYNCED' WHERE id = ligne.id
                    await db.run("UPDATE mutation_queue SET status = 'SYNCED' WHERE id = ?", [action.id]);
                } else {
                    // Peut-être parser l'erreur pour voir si c'est un conflit de données, en attendant on FAILED.
                    console.error(`Erreur serveur pour l'action ${action.id} (${action.endpoint}): ${response.status}`);
                    await db.run("UPDATE mutation_queue SET status = 'FAILED' WHERE id = ?", [action.id]);
                }
            } catch (fetchError) {
                console.error(`Impossible de synchroniser l'action ${action.id}, réseau instable ? On la laisse en PENDING.`, fetchError);
                break; // On arrête la boucle si le réseau coupe en cours de route.
            }
        }

    } catch (dbError) {
        console.error("Erreur lors de la lecture de la Mutation Queue", dbError);
    }
};
