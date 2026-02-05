import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface MemoryInput {
    content: string;
    embedding: number[];
    tags: string[];
    type?: string;
    profileId: string;
}

export interface MemoryQueryResult {
    id: string;
    content: string;
    similarity: number;
}

export class SupabasePgVectorStore {
    private client;

    constructor() {
        this.client = createClient(supabaseUrl, supabaseKey);
    }

    // AJOUT (Ingestion)
    async addMemory(memory: MemoryInput) {
        let safeType = memory.type || 'MEMORY';
        const safeTags = [...(memory.tags || [])];

        // Sécurité au cas où on retombe sur une base stricte un jour
        if (safeType === 'file_upload') {
            // On laisse passer file_upload maintenant que la base est libre
            // Mais on garde la logique de tag par sécurité
            safeTags.push('file_upload');
        }

        const payload: any = {
            content: memory.content,
            tags: safeTags,
            type: safeType,
            "profileId": memory.profileId
        };

        if (memory.embedding && memory.embedding.length > 0) {
            payload.embedding = memory.embedding;
        }

        const { error } = await this.client
            .from('memories')
            .insert(payload);

        if (error) {
            console.error("Supabase Insert Error:", error);
            throw new Error(`Failed to upsert vector: ${error.message}`);
        }
    }

    // RECHERCHE (RAG)
    async query(vector: number[], filter: { profileId: string }): Promise<MemoryQueryResult[]> {

        // --- CORRECTION CRITIQUE ICI ---
        // On appelle la fonction SQL avec les noms de paramètres EXACTS
        const { data, error } = await this.client.rpc('match_memories', {
            query_embedding: vector,
            match_threshold: 0.4,       // Seuil tolérant pour trouver le souvenir
            match_count: 5,
            query_profile_id: filter.profileId // <--- C'est la clé du succès !
        });

        if (error) {
            console.error("Supabase Search Error:", error);
            // On logue l'erreur mais on ne crash pas l'app, on renvoie une liste vide
            return [];
        }

        return (data || []).map((row: any) => ({
            id: row.id,
            content: row.content,
            similarity: row.similarity
        }));
    }

    // SUPPRESSION (Oubli)
    async deleteMemory(id: string) {
        const { error } = await this.client
            .from('memories')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Supabase Delete Error:", error);
            throw new Error(`Failed to delete memory: ${error.message}`);
        }
    }
}

export const vectorStore = new SupabasePgVectorStore();