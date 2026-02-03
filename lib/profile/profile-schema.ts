/**
 * Profile Schema and Types
 * TypeScript interfaces for profile data structures
 */

export interface DigitalTwinProfile {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    lastAccessedAt: Date;
    vectorNamespace: string;
}

export interface ProfileMetadata {
    preferences: {
        theme?: 'light' | 'dark' | 'auto';
        language?: string;
        timezone?: string;
    };
    settings: {
        autoLockTimeout?: number; // minutes
        enableBiometrics?: boolean;
    };
    createdBy: string;
    version: string;
}

export interface MemoryData {
    id: string;
    profileId: string;
    content: string; // Decrypted content
    metadata: {
        tags?: string[];
        context?: string;
        source?: string;
        [key: string]: any;
    };
    type: MemoryType;
    createdAt: Date;
    updatedAt: Date;
}

export enum MemoryType {
    TEXT = 'TEXT',
    IMAGE = 'IMAGE',
    VIDEO = 'VIDEO',
    AUDIO = 'AUDIO',
    DOCUMENT = 'DOCUMENT',
    CONVERSATION = 'CONVERSATION',
}

export interface VectorStoreConfig {
    provider: 'supabase-pgvector';
    namespace: string;
    dimension: number;
    model: string;
}
