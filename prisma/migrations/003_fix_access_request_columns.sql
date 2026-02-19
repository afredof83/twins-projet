-- Migration : Alignement table AccessRequest avec le schéma Prisma
-- À exécuter dans : Supabase > SQL Editor

-- 1. Renommer les anciennes colonnes si elles existent sous les mauvais noms
DO $$
BEGIN
  -- sender_id → requester_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'AccessRequest' AND column_name = 'sender_id'
  ) THEN
    ALTER TABLE "AccessRequest" RENAME COLUMN sender_id TO requester_id;
  END IF;

  -- receiver_id → provider_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'AccessRequest' AND column_name = 'receiver_id'
  ) THEN
    ALTER TABLE "AccessRequest" RENAME COLUMN receiver_id TO provider_id;
  END IF;

  -- senderId → requester_id (camelCase)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'AccessRequest' AND column_name = 'senderId'
  ) THEN
    ALTER TABLE "AccessRequest" RENAME COLUMN "senderId" TO requester_id;
  END IF;

  -- receiverId → provider_id (camelCase)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'AccessRequest' AND column_name = 'receiverId'
  ) THEN
    ALTER TABLE "AccessRequest" RENAME COLUMN "receiverId" TO provider_id;
  END IF;
END $$;

-- 2. Ajouter la colonne topic si elle n'existe pas
ALTER TABLE "AccessRequest" ADD COLUMN IF NOT EXISTS topic TEXT;

-- 3. S'assurer que created_at existe
ALTER TABLE "AccessRequest" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Forcer le rechargement du cache schema PostgREST
NOTIFY pgrst, 'reload schema';
