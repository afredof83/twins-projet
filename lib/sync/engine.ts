import { Network } from '@capacitor/network';
import { getApiUrl } from '@/lib/api';
import { createClient } from '../supabaseBrowser';
import { getLocalDb } from '../local-db/init';

/**
 * 🛠️ SYNC ENGINE - Idempotent & Offline-First
 * Implements UUID v4 Idempotency, 401 Auth Recovery, and Exponential Backoff.
 */

const MAX_RETRY_DELAY = 60000; // 1 minute
const INITIAL_RETRY_DELAY = 1000; // 1 second
let isSyncing = false;

export const performAction = async (endpoint: string, method: string, payload: any) => {
    const status = await Network.getStatus();
    const idempotencyKey = crypto.randomUUID(); // Mandatory UUID v4

    if (status.connected) {
        try {
            const response = await fetchWithAuth(endpoint, method, payload, idempotencyKey);
            
            if (response.ok) return await response.json();
            
            // If 401, it's better to queue and let the flush handle the refresh logic
            if (response.status === 401) {
                console.warn("🔐 401 detected in immediate action. Queuing for background recovery.");
            }
            
            return await queueMutation(endpoint, method, payload, idempotencyKey);
        } catch (e) {
            console.error("⚠️ Immediate fetch failed, queuing:", e);
            return await queueMutation(endpoint, method, payload, idempotencyKey);
        }
    } else {
        return await queueMutation(endpoint, method, payload, idempotencyKey);
    }
};

const fetchWithAuth = async (endpoint: string, method: string, payload: any, idempotencyKey: string) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: any = { 
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey 
    };
    
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

    return await fetch(getApiUrl(endpoint), {
        method,
        headers,
        body: JSON.stringify(payload)
    });
};

const queueMutation = async (endpoint: string, method: string, payload: any, idempotencyKey: string) => {
    const db = await getLocalDb();
    const id = crypto.randomUUID();

    const query = `INSERT INTO mutation_queue (id, endpoint, method, payload, idempotencyKey, createdAt, status) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    await db.run(query, [
        id, 
        endpoint, 
        method, 
        JSON.stringify(payload), 
        idempotencyKey, 
        new Date().toISOString(),
        'PENDING'
    ]);

    // Proactively trigger flush if online
    const status = await Network.getStatus();
    if (status.connected) flushMutationQueue();

    return { success: true, offline: true, idempotencyKey };
};

export const setupBackgroundSync = () => {
    Network.addListener('networkStatusChange', async (status) => {
        if (status.connected) {
            console.log("🌐 Network Restored: Triggering Flush.");
            await flushMutationQueue();
        }
    });
};

export const flushMutationQueue = async () => {
    if (isSyncing) return;
    isSyncing = true;

    try {
        const db = await getLocalDb();
        const result = await db.query("SELECT * FROM mutation_queue WHERE status = 'PENDING' ORDER BY createdAt ASC");
        const mutations = result.values || [];

        if (mutations.length === 0) {
            isSyncing = false;
            return;
        }

        console.log(`📡 [SYNC] Processing ${mutations.length} mutations...`);

        for (const mutation of mutations) {
            let success = false;
            let retryDelay = INITIAL_RETRY_DELAY;
            let attempts = 0;

            while (!success && attempts < 8) {
                try {
                    const response = await fetchWithAuth(
                        mutation.endpoint, 
                        mutation.method, 
                        JSON.parse(mutation.payload), 
                        mutation.idempotencyKey
                    );

                    if (response.ok) {
                        await db.run("UPDATE mutation_queue SET status = 'SYNCED' WHERE id = ?", [mutation.id]);
                        success = true;
                    } else if (response.status === 401) {
                        // 🔐 Session recovery logic
                        console.warn("🔐 401: Attempting session refresh...");
                        const supabase = createClient();
                        const { error } = await supabase.auth.refreshSession();
                        
                        if (error) {
                            console.error("❌ Refresh failed. Sync paused until next trigger.");
                            isSyncing = false;
                            return; 
                        }
                        // Continue loop to retry with fresh token
                        console.log("✅ Session refreshed. Retrying mutation.");
                    } else if (response.status >= 500) {
                        throw new Error(`Server Error: ${response.status}`);
                    } else {
                        // 4xx other than 401: Definitive failure
                        console.error(`❌ Mutation ${mutation.id} failed with ${response.status}`);
                        await db.run("UPDATE mutation_queue SET status = 'FAILED' WHERE id = ?", [mutation.id]);
                        success = true;
                    }
                } catch (error) {
                    attempts++;
                    if (attempts >= 8) {
                        console.error(`🔥 Max retries for ${mutation.id}. Giving up.`);
                        break;
                    }
                    console.warn(`⏳ Network retry ${attempts} in ${retryDelay}ms...`);
                    await new Promise(r => setTimeout(r, retryDelay));
                    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
                }
            }
        }
    } catch (err) {
        console.error("🔥 Sync Engine Critical:", err);
    } finally {
        isSyncing = false;
    }
};
