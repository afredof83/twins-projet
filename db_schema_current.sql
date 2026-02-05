-- SAUVEGARDE DU SCHÉMA (État stable - RAG + Scribe + Cortex)

-- 1. Extension Vectorielle
create extension if not exists vector;

-- 2. Table des Souvenirs (Structure Flexible)
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  content text,
  embedding vector(1024),      -- Compatible Mistral
  "profileId" text,
  tags text[],
  type text,                   -- 'MEMORY' (IA) ou 'secret' (Scribe)
  "createdAt" timestamp with time zone default timezone('utc'::text, now()),
  "updatedAt" timestamp with time zone
);

-- 3. Fonction de Recherche RAG
-- Note: paramètre query_profile_id pour matcher le code TypeScript
create or replace function match_memories (
  query_embedding vector(1024),
  match_threshold float,
  match_count int,
  query_profile_id text
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query(
    select
      memories.id,
      memories.content,
      1 - (memories.embedding <=> query_embedding) as similarity
    from memories
    where 1 - (memories.embedding <=> query_embedding) > match_threshold
    and memories."profileId" = query_profile_id
    order by memories.embedding <=> query_embedding
    limit match_count;
  );
end;
$$;