-- Fonction de maintenance du Cortex (Nettoyage)
CREATE OR REPLACE FUNCTION run_cortex_maintenance(p_profile_id TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Supprimer les souvenirs expirés (ex: News de plus de 7 jours)
  DELETE FROM "Memory"
  WHERE "profileId" = p_profile_id
    AND "expires_at" < NOW();

  -- 2. Supprimer les doublons exacts (on garde le plus récent grace à l'ID ou CreatedAt)
  -- Ici on supprime A si B existe avec le même content et un ID plus "grand" (ou créé après)
  DELETE FROM "Memory" a
  USING "Memory" b
  WHERE a.id < b.id
    AND a."profileId" = p_profile_id
    AND b."profileId" = p_profile_id
    AND a.content = b.content;
END;
$$;
