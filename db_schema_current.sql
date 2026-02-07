-- 1. Table de Messagerie
CREATE TABLE IF NOT EXISTS "Message" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "fromId" TEXT NOT NULL,
  "toId" TEXT NOT NULL,
  "content" TEXT,
  "isRead" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Message_toId_idx" ON "Message" ("toId");

-- 2. Fonction Recherche Globale (Radar)
CREATE OR REPLACE FUNCTION match_global_memories(
  query_embedding vector(1024),
  searcher_profile_id text,
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id text,
  profile_id text,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    "Memory".id,
    "Memory"."profileId" as profile_id,
    "Memory"."encryptedContent" as content,
    1 - ("Memory".embedding <=> query_embedding) as similarity
  FROM "Memory"
  WHERE "Memory"."profileId" != searcher_profile_id
  AND 1 - ("Memory".embedding <=> query_embedding) > match_threshold
  ORDER BY "Memory".embedding <=> query_embedding
  LIMIT match_count;
END;
$$;