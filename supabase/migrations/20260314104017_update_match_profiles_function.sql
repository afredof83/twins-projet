-- Migration: Update match_profiles for snake_case and security
-- Raison: Alignement avec Prisma (@map) et patch faille search_path (WARN linter)

CREATE OR REPLACE FUNCTION public.match_profiles(
    query_embedding vector, 
    match_threshold double precision, 
    match_count integer, 
    min_tjm integer DEFAULT 0, 
    max_tjm integer DEFAULT 2000, 
    target_role text DEFAULT NULL::text
)
RETURNS TABLE(
    id text, 
    name text, 
    primary_role text, 
    tjm integer, 
    availability text, 
    bio text, 
    similarity double precision
)
LANGUAGE plpgsql
SET search_path = ''
AS $function$
begin
  return query
  select
    p.id::text, 
    p.name,
    p.primary_role,
    p.tjm,
    p.availability,
    p.bio,
    (1 - (p.bio_embedding <=> query_embedding))::double precision as similarity
  from profiles p
  where
    (target_role is null or p.primary_role = target_role)
    and p.tjm >= min_tjm
    and p.tjm <= max_tjm
    and (1 - (p.bio_embedding <=> query_embedding)) > match_threshold
  order by similarity desc
  limit match_count;
end;
$function$;
