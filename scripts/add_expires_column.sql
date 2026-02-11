-- Ajout de la colonne d'expiration pour les souvenirs éphémères (news, etc.)
ALTER TABLE "Memory" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP WITH TIME ZONE;

-- Index pour nettoyer efficacement les souvenirs expirés
CREATE INDEX IF NOT EXISTS "Memory_expires_at_idx" ON "Memory" ("expires_at");
