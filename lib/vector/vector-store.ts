/**
 * Vector Store Interface
 * Abstraction layer for vector database operations with encryption support
 */

export interface VectorMetadata {
    profileId: string;
    memoryId: string;
    type: string;
    createdAt: string;
    [key: string]: any; // Additional encrypted metadata
}

export interface VectorSearchResult {
    id: string;
    score: number;
    metadata: VectorMetadata;
}

export interface VectorStore {
    /**
     * Inserts or updates a vector with metadata
     */
    upsert(
        id: string,
        embedding: number[],
        metadata: VectorMetadata
    ): Promise<void>;

    /**
     * Searches for similar vectors
     */
    query(
        embedding: number[],
        profileId: string,
        limit?: number
    ): Promise<VectorSearchResult[]>;

    /**
     * Deletes a vector by ID
     */
    delete(id: string): Promise<void>;

    /**
     * Deletes all vectors for a profile
     */
    deleteByProfile(profileId: string): Promise<void>;
}
