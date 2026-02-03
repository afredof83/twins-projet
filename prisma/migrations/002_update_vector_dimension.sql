-- Migration: Update vector dimension from 1536 to 1024 for Mistral Embed
-- WARNING: This will clear existing embeddings
-- Run this migration AFTER updating your application code

-- Drop the old function
DROP FUNCTION IF EXISTS match_memories;

-- Alter the embedding column (this will clear existing data)
ALTER TABLE "Memory" 
ALTER COLUMN embedding TYPE vector(1024);

-- Recreate the function with new dimension
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

-- Recreate index
DROP INDEX IF EXISTS memory_embedding_idx;
CREATE INDEX memory_embedding_idx 
ON "Memory" 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

COMMENT ON FUNCTION match_memories IS 'Performs semantic search on memories using Mistral Embed (1024-dim) with pgvector cosine similarity, strictly filtered by profile ID for Zero-Knowledge isolation';
