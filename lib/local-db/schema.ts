export const LOCAL_SCHEMA = `
  -- Table pour stocker les alertes et opportunités hors-ligne
  CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    sourceId TEXT,
    targetId TEXT,
    matchScore INTEGER,
    summary TEXT,
    status TEXT,
    createdAt TEXT
  );

  -- ⚡ LE CŒUR DU MODE HORS-LIGNE ⚡
  -- Toute action faite sans internet va ici
  CREATE TABLE IF NOT EXISTS mutation_queue (
    id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,          -- ex: '/api/opportunities/accept'
    method TEXT NOT NULL,            -- 'POST', 'PATCH'
    payload TEXT NOT NULL,           -- JSON stringifié des données
    status TEXT DEFAULT 'PENDING',   -- 'PENDING', 'SYNCED', 'FAILED'
    createdAt TEXT NOT NULL
  );
`;
