-- Table pour gérer les sources dynamiques du Radar
CREATE TABLE IF NOT EXISTS "RadarSource" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "profileId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "RadarSource_profileId_idx" ON "RadarSource" ("profileId");
