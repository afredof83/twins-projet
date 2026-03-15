# ARCHITECTURE SNAPSHOT

## 1. Arborescence du Projet (Tree)
```text
.
├── android/ (Mobile Native Layer)
│   ├── app/
│   └── capacitor.build.gradle
├── app/ (Next.js Application Layer)
│   ├── actions/ (Server-Side Logic)
│   ├── api/ (Restful Infrastructure)
│   ├── auth/ (Authentication UI & Flow)
│   ├── chat/ (Secure Messaging UI)
│   ├── components/ (Page-Specific UI)
│   ├── connections/ (Networking UI)
│   ├── cortex/ (AI Soul Interface)
│   ├── login/ (Entry Point)
│   ├── memories/ (Long-term Memory UI)
│   ├── profile/ (Multi-Prism Management)
│   └── radar/ (Strategic Scanning UI)
├── components/ (Atomic & Shared UI)
├── context/ (State Synchronization Providers)
├── hooks/ (Client-Side Business Logic)
├── inngest/ (Workflow Orchestration)
├── lib/ (Core Services & Drivers)
│   ├── crypto/ (Zero-Knowledge Engine)
│   ├── db/ (Database Clients)
│   └── vector/ (PgVector Utilities)
├── prisma/ (Data Modeling)
│   └── schema.prisma (Single Source of Truth)
├── public/ (Static Distribution)
├── scripts/ (Automation & Tooling)
├── store/ (Reactive Global State)
└── supabase/ (Database Infrastructure)
    ├── functions/ (Edge Computing)
    └── migrations/ (Schema Versioning)
```

## 2. La Fondation de Données (Prisma)
### prisma/schema.prisma
```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  extensions = [uuid_ossp(map: "uuid-ossp", schema: "extensions"), vector]
}

model Profile {
  id                   String                 @id @default(uuid())
  email                String                 @unique
  name                 String?                @default("Agent Furtif")
  avatarUrl            String?                @map("avatar_url")
  unifiedAnalysis      String?                @map("unified_analysis")
  availability         String?
  bio                  String?
  tjm                  Int?
  fcmToken             String?                @map("fcm_token")
  publicKey            String?                @map("public_key")
  unifiedEmbedding     Unsupported("vector")? @map("unified_embedding")
  age                  Int?
  city                   String?
  country                String?
  gender                 String?
  createdAt              DateTime               @default(now()) @map("created_at")
  customRole             String?                @map("custom_role")
  primaryRole            String?                @map("primary_role")
  thematicProfile      Json?                  @map("thematic_profile")
  updatedAt              DateTime               @default(now()) @updatedAt @map("updated_at")
  bioEmbedding         Unsupported("vector")? @map("bio_embedding")
  
  userId               String?                @map("user_id")
  type                 String?                @default("WORK") @map("type")
  metadataVector       Unsupported("vector(1536)")? @map("metadata_vector")
  displayName          String?                @map("display_name")
  
  sector               String?
  hobbyBio             String?                @map("hobby_bio")
  hobbyEmbedding         Unsupported("vector")? @map("hobby_embedding")
  hobbyRole              String?                @map("hobby_role")
  hobbySector            String?                @map("hobby_sector")
  
  socialBio            String?                @map("social_bio")
  socialEmbedding        Unsupported("vector")? @map("social_embedding")
  socialRole             String?                @map("social_role")
  socialSector           String?                @map("social_sector")

  language             String                 @default("fr")
  activePrism          String?                @default("WORK") @map("active_prism")
  
  initiatedConnections Connection[]           @relation("InitiatedConnections")
  receivedConnections  Connection[]           @relation("ReceivedConnections")
  notes                CortexNote[]
  discoveries            Discovery[]
  files                  FileArchive[]
  matchesInitiated       Match[]                @relation("UserA")
  matchesReceived        Match[]                @relation("UserB")
  messagesReceived       Message[]              @relation("Receiver")
  messagesSent           Message[]              @relation("Sender")
  initiatedOpportunities Opportunity[]        @relation("InitiatedOpportunities")
  receivedOpportunities  Opportunity[]        @relation("ReceivedOpportunities")
  radars               RadarResult[]
  memories             Memory[]

  @@index([primaryRole])
  @@index([availability])
  @@index([tjm])
  @@unique([userId, type])
  @@map("profiles")
}

model FileArchive {
  id         String   @id @default(uuid())
  profileId  String   @map("profile_id")
  fileName   String   @map("file_name")
  fileUrl    String   @map("file_url")
  mimeType   String   @map("mime_type")
  isAnalyzed Boolean  @default(false) @map("is_analyzed")
  createdAt  DateTime @default(now()) @map("created_at")
  profile    Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  
  @@map("file_archives")
}

model CortexNote {
  id        String                 @id @default(uuid())
  profileId String                 @map("profile_id")
  content   String
  embedding Unsupported("vector")?
  createdAt DateTime               @default(now()) @map("created_at")
  profile   Profile                @relation(fields: [profileId], references: [id], onDelete: Cascade)
  
  @@map("cortex_notes")
}

model RadarResult {
  id          String   @id @default(uuid())
  profileId   String   @map("profile_id")
  opportunity String
  sourceUrl   String?  @map("source_url")
  score       Float
  isHidden    Boolean  @default(false) @map("is_hidden")
  createdAt   DateTime @default(now()) @map("created_at")
  profile     Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  
  @@map("radar_results")
}

model Match {
  id         String      @id @default(uuid())
  userAId    String      @map("user_a_id")
  userBId    String      @map("user_b_id")
  matchScore Float       @map("match_score")
  statusA    MatchStatus @default(PENDING) @map("status_a")
  statusB    MatchStatus @default(PENDING) @map("status_b")
  createdAt  DateTime    @default(now()) @map("created_at")
  userA      Profile     @relation("UserA", fields: [userAId], references: [id], onDelete: Cascade)
  userB      Profile     @relation("UserB", fields: [userBId], references: [id], onDelete: Cascade)

  @@unique([userAId, userBId])
  @@map("matches")
}

model Message {
  id         String   @id @default(uuid())
  senderId   String   @map("sender_id")
  receiverId String   @map("receiver_id")
  content    String
  isRead     Boolean  @default(false) @map("is_read")
  createdAt  DateTime @default(now()) @map("created_at")
  receiver   Profile  @relation("Receiver", fields: [receiverId], references: [id], onDelete: Cascade)
  sender     Profile  @relation("Sender", fields: [senderId], references: [id], onDelete: Cascade)
  
  @@map("messages")
}

model Memory {
  id               String                 @id @default(uuid())
  content          String
  encryptedContent String?                @map("encrypted_content")
  type             String                 @default("thought")
  source           String?
  embedding        Unsupported("vector")?
  tags             Json?
  expiresAt        DateTime?              @map("expires_at")
  createdAt        DateTime               @default(now()) @map("created_at")
  profileId        String                 @map("profile_id")
  profile          Profile                @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@map("memories")
}

model Discovery {
  id        String   @id @default(uuid())
  title     String
  company   String?
  score     Int
  reason    String?
  url       String?
  createdAt DateTime @default(now()) @map("created_at")
  profileId String   @map("profile_id")
  profile   Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  
  @@map("discoveries")
}

model Connection {
  id          String   @id @default(uuid())
  initiatorId String   @map("initiator_id")
  receiverId  String   @map("receiver_id")
  status      String   @default("PENDING")
  createdAt   DateTime @default(now()) @map("created_at")
  initiator   Profile  @relation("InitiatedConnections", fields: [initiatorId], references: [id], onDelete: Cascade)
  receiver    Profile  @relation("ReceivedConnections", fields: [receiverId], references: [id], onDelete: Cascade)
  
  @@map("connections")
}

model Opportunity {
  id            String   @id @default(cuid())
  sourceId      String   @map("source_id")
  targetId      String   @map("target_id")
  matchScore    Int      @map("match_score")
  audit         String?
  status        String   @default("DETECTED")
  title         String?
  createdAt     DateTime @default(now()) @map("created_at")
  synergies     String
  context       String?  @default("WORK")
  sourceProfile Profile  @relation("InitiatedOpportunities", fields: [sourceId], references: [id], onDelete: Cascade)
  targetProfile Profile  @relation("ReceivedOpportunities", fields: [targetId], references: [id], onDelete: Cascade)
  
  @@map("opportunities")
}

enum MatchStatus {
  PENDING
  ACCEPTED
  REJECTED
}
```

## 3. L'Infrastructure Supabase (SQL)
### supabase/migrations/20260312_master_identity_triad.sql
```sql
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
```

### supabase/migrations/20260314104017_update_match_profiles_function.sql
```sql
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
```

## 4. Les Configurations Moteurs
### package.json (Dependencies)
```json
  "dependencies": {
    "@capacitor-community/sqlite": "^8.0.0",
    "@capacitor/android": "^8.1.0",
    "@capacitor/app": "^8.0.1",
    "@capacitor/core": "^8.1.0",
    "@capacitor/ios": "^8.1.0",
    "@capacitor/network": "^8.0.1",
    "@capacitor/push-notifications": "^8.0.1",
    "@capacitor/splash-screen": "^8.0.1",
    "@huggingface/transformers": "^3.8.1",
    "@mistralai/mistralai": "^1.14.0",
    "@noble/hashes": "^2.0.1",
    "@prisma/client": "^7.4.2",
    "@supabase/auth-helpers-nextjs": "^0.15.0",
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.98.0",
    "bip39": "^3.1.0",
    "capacitor-native-biometric": "^4.2.2",
    "capacitor-secure-storage-plugin": "^0.13.0",
    "cheerio": "^1.2.0",
    "clsx": "^2.1.1",
    "cobe": "^0.6.5",
    "dotenv": "^17.2.4",
    "firebase-admin": "^13.7.0",
    "framer-motion": "^12.34.3",
    "hono": "^4.12.5",
    "inngest": "^3.52.6",
    "llamaindex": "^0.12.1",
    "lucide-react": "^0.563.0",
    "mammoth": "^1.11.0",
    "next": "16.1.6",
    "pdfjs-dist": "^5.5.207",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-globe.gl": "^2.37.0",
    "react-markdown": "^10.1.0",
    "rss-parser": "^3.13.0",
    "swr": "^2.4.1",
    "tailwind-merge": "^3.5.0",
    "web-push": "^3.6.7",
    "zustand": "^5.0.11"
  },
  "devDependencies": {
    "@capacitor/assets": "^3.0.5",
    "@capacitor/cli": "^8.1.0",
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^20",
    "@types/pdf-parse": "^1.1.5",
    "@types/pdfjs-dist": "^2.10.377",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/web-push": "^3.6.4",
    "cross-env": "^10.1.0",
    "eslint": "^9",
    "eslint-config-next": "^16.1.6",
    "patch-package": "^8.0.1",
    "postinstall-postinstall": "^2.1.0",
    "prisma": "^7.4.2",
    "server-only": "^0.0.1",
    "tailwindcss": "^4.0.0",
    "typescript": "^5"
  }
```

### middleware.ts
*Note: Aucun fichier middleware.ts détecté à la racine ou dans /src. La sécurité est gérée au niveau des routes API (auth-guard) et des policies RLS Supabase.*

### lib/prisma.ts (Instanciation)
```typescript
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error', 'warn']
  }) 
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

export const getPrismaForUser = (userId: string) => {
  return prisma;
};
```

### lib/db/supabase.ts (Client Supabase Master)
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});

export function getSupabaseAdmin() {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}
```

## 5. La Cartographie de l'API
- `/api/agent`: Interactions conversationnelles avec l'agent IA.
- `/api/auth/init-profile`: Création du profil initial après authentification.
- `/api/auth/sync`: Synchronisation de l'état de session client/serveur.
- `/api/auth/sync-profile`: Synchronisation du profil Prisma pour persistance backend.
- `/api/auth-guard`: Protection et validation JWT des routes privées.
- `/api/auto-ingest`: Ingestion automatique de sources de données externes.
- `/api/chat/history`: Récupération sécurisée de l'historique des échanges.
- `/api/chat`: Handler de messagerie et de commandes chat.
- `/api/connection`: Gestion des demandes de networking entre twins.
- `/api/cortex`: Interface REST avec le moteur cognitif Cortex.
- `/api/cron/cortex`: Nettoyage et optimisation périodique de la mémoire Cortex.
- `/api/cron/daily-report`: Compilation automatisée de l'intelligence quotidienne.
- `/api/cron/radar`: Scan planifié du réseau pour opportunités WORK.
- `/api/cron/radar-furtif`: Détection confidentielle d'opportunités critiques.
- `/api/generate-opener`: Création d'ice-breakers contextuels via IA.
- `/api/guardian`: Surveillance active et détection d'intrusions.
- `/api/inngest`: Orchestration des workflows complexes asynchrones.
- `/api/ipse-advisor`: Assistance stratégique et conseil par Mistral AI.
- `/api/memories`: CRUD et recherche sémantique dans la mémoire long-terme.
- `/api/notifications`: Dispatch de notifications push (FCM).
- `/api/opportunities/evaluate`: Analyse multicritères d'un match potentiel.
- `/api/opportunities`: Listing et workflow des opportunités métier.
- `/api/profile/hobby`: Gestion du prisme HOBBY (données & vecteurs).
- `/api/profile`: Identité centrale (Nom, Âge, Localisation, Clé Publique).
- `/api/profile/settings`: Paramètres globaux et préférences utilisateur.
- `/api/profile/social`: Gestion du prisme SOCIAL/DATING.
- `/api/profile/work`: Gestion du prisme WORK (Bio pro, TJM, Rôle).
- `/api/radar`: Déclenchement manuel de la détection de proximité.
- `/api/scan-network`: Analyse sémantique des twins environnants.
- `/api/sync-cortex`: Exportation de la conscience locale vers le Cloud.
- `/api/terminal`: Commandes système bas-niveau pour debug et monitoring.
- `/api/translation`: Service de traduction neuronale pour les échanges.
