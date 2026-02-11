-- Création de la table AccessRequest si elle n'existe pas
CREATE TABLE IF NOT EXISTS "AccessRequest" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "requester_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "topic" TEXT,
  "match_score" INTEGER,
  "status" TEXT DEFAULT 'pending',
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour des recherches rapides
CREATE INDEX IF NOT EXISTS "AccessRequest_provider_id_idx" ON "AccessRequest"("provider_id");
CREATE INDEX IF NOT EXISTS "AccessRequest_requester_id_idx" ON "AccessRequest"("requester_id");

-- Création de la table DirectMessage si elle n'existe pas (pour l'étape 4)
CREATE TABLE IF NOT EXISTS "DirectMessage" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "sender_id" TEXT NOT NULL,
  "receiver_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS "DirectMessage_sender_receiver_idx" ON "DirectMessage"("sender_id", "receiver_id");
