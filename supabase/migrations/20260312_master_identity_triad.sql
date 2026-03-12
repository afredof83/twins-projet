-- MASTER SQL MIGRATION: IDENTITY TRIAD & VECTOR ISOLATION
-- Goal: Transform Profiles into a triad (WORK, HOBBY, DATING) while preserving existing Message/Connection relations.

-- 1. Extensions & Types
CREATE EXTENSION IF NOT EXISTS vector;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prism_type') THEN
        CREATE TYPE prism_type AS ENUM ('WORK', 'HOBBY', 'DATING');
    END IF;
END $$;

-- 2. Add New Columns to Profile
ALTER TABLE "Profile" 
ADD COLUMN IF NOT EXISTS "user_id" UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS "type" prism_type DEFAULT 'WORK',
ADD COLUMN IF NOT EXISTS "metadata_vector" vector(1536),
ADD COLUMN IF NOT EXISTS "display_name" TEXT,
ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;

-- 3. Data Migration (Production Safe)
UPDATE "Profile" 
SET "user_id" = CAST(id AS UUID), 
    "type" = 'WORK'
WHERE "user_id" IS NULL;

-- 4. Constraints
ALTER TABLE "Profile" 
ADD CONSTRAINT profile_user_type_unique UNIQUE (user_id, type);

-- 5. Indexing (HNSW)
CREATE INDEX IF NOT EXISTS profile_metadata_vector_hnsw 
ON "Profile" USING hnsw (metadata_vector vector_cosine_ops);

-- 6. RLS Policies
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own profiles" ON "Profile";
CREATE POLICY "Users can manage their own profiles" 
ON "Profile" 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Blind discovery policy" ON "Profile";
CREATE POLICY "Blind discovery policy" 
ON "Profile" 
FOR SELECT 
TO authenticated
USING (
    "type"::text = current_setting('app.current_prism', true)
);
