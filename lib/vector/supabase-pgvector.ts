/**
 * Supabase pgvector Adapter
 * Implements vector storage using Supabase's PostgreSQL with pgvector extension
 */

import { getSupabaseAdmin } from '../db/supabase';
import type { VectorStore, VectorMetadata, VectorSearchResult } from './vector-store';

export class SupabasePgVectorStore implements VectorStore {
    private tableName = 'Memory'; // Prisma table name

    /**
     * Inserts or updates a vector embedding in the database
     * Note: The actual insert is done via Prisma, this is for direct vector operations
     */
    async upsert(
        id: string,
        embedding: number[],
        metadata: VectorMetadata
    ): Promise<void> {
        const supabase = getSupabaseAdmin();

        // Convert embedding array to pgvector format (Correction du guillemet ici)
        const vectorString = `[${embedding.join(',')}]`;

        const { error } = await supabase
            .from(this.tableName)
            .upsert({
                id,
                profileId: metadata.profileId,
                embedding: vectorString,
                encryptedMetadata: JSON.stringify(metadata),
                type: metadata.type,
                updatedAt: new Date().toISOString(),
            });

        if (error) {
            throw new Error(`Failed to upsert vector: ${error.message}`);
        }
    }

    /**
     * Performs semantic search using cosine similarity
     * Strictly filtered by profileId for isolation
     */
    async query(
        embedding: number[],
        profileId: string,
        limit: number = 10
    ): Promise<VectorSearchResult[]> {
        const supabase = getSupabaseAdmin();

        // Convert query embedding to pgvector format
        const vectorString = `[${embedding.join(',')}]`;

        // Use pgvector's cosine similarity operator (<=>)
        // Lower distance = higher similarity
        const { data, error } = await supabase.rpc('match_memories', {
            query_embedding: vectorString,
            query_profile_id: profileId,
            match_threshold: 0.7, // Similarity threshold (0-1)
            match_count: limit,
        });

        if (error) {
            throw new Error(`Failed to query vectors: ${error.message}`);
        }

        return (data || []).map((row: any) => ({
            id: row.id,
            score: 1 - row.similarity, // Convert distance to similarity score
            metadata: JSON.parse(row.encrypted_metadata) as VectorMetadata,
        }));
    }

    /**
     * Deletes a specific vector by ID
     */
    async delete(id: string): Promise<void> {
        const supabase = getSupabaseAdmin();

        const { error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete vector: ${error.message}`);
        }
    }

    /**
     * Deletes all vectors for a specific profile
     * Used when deleting a profile
     */
    async deleteByProfile(profileId: string): Promise<void> {
        const supabase = getSupabaseAdmin();

        const { error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('profileId', profileId);

        if (error) {
            throw new Error(`Failed to delete profile vectors: ${error.message}`);
        }
    }
}

// Singleton instance
export const vectorStore = new SupabasePgVectorStore();