-- SQL Migration for pgvector Setup
-- Run this in your Supabase SQL Editor or PostgreSQL database

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create function for semantic search with cosine similarity
-- This function is called by the Supabase pgvector adapter
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1024),
  query_profile_id text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id text,
  profile_id text,
  encrypted_content text,
  encrypted_metadata text,
  type text,
  created_at timestamp,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    "Memory".id,
    "Memory"."profileId" as profile_id,
    "Memory"."encryptedContent" as encrypted_content,
    "Memory"."encryptedMetadata" as encrypted_metadata,
    "Memory".type::text,
    "Memory"."createdAt" as created_at,
    1 - ("Memory".embedding <=> query_embedding) as similarity
  FROM "Memory"
  WHERE "Memory"."profileId" = query_profile_id
    AND 1 - ("Memory".embedding <=> query_embedding) > match_threshold
  ORDER BY "Memory".embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create index on embedding column for faster similarity search
CREATE INDEX IF NOT EXISTS memory_embedding_idx 
ON "Memory" 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index on profileId for isolation queries
CREATE INDEX IF NOT EXISTS memory_profile_id_idx 
ON "Memory" ("profileId");

-- Create composite index for profile + type queries
CREATE INDEX IF NOT EXISTS memory_profile_type_idx 
ON "Memory" ("profileId", type);

-- Create index on createdAt for temporal queries
CREATE INDEX IF NOT EXISTS memory_created_at_idx 
ON "Memory" ("createdAt" DESC);

-- Enable Row Level Security (RLS) for additional protection
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Memory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecoveryPhrase" ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be configured based on your authentication setup
-- Example policy (adjust based on your auth system):
-- CREATE POLICY "Users can only access their own profiles"
--   ON "Profile"
--   FOR ALL
--   USING (auth.uid()::text = id);

COMMENT ON FUNCTION match_memories IS 'Performs semantic search on memories using pgvector cosine similarity, strictly filtered by profile ID for Zero-Knowledge isolation';
COMMENT ON INDEX memory_embedding_idx IS 'IVFFlat index for fast approximate nearest neighbor search on embeddings';
