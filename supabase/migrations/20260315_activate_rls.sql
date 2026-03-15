-- 🛡️ Database Security - RLS Activation Migration
-- Target Tables: messages, memories, discoveries, file_archives, cortex_notes, radar_results, matches, connections, opportunities
-- Strategy: Strict Deny-by-Default (No policies created yet)

-- 1. Enable RLS on all target tables
ALTER TABLE IF EXISTS "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "memories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "discoveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "file_archives" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "cortex_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "radar_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "matches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "opportunities" ENABLE ROW LEVEL SECURITY;

-- 2. Cleanup: Ensure no permissive policies exist on these tables
-- This ensures that enabling RLS doesn't accidentally leave an "allow all" policy from a previous session.
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
            'messages', 'memories', 'discoveries', 'file_archives', 
            'cortex_notes', 'radar_results', 'matches', 'connections', 'opportunities'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Permissive Policy" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow All" ON %I', t);
    END LOOP;
END $$;

-- 🔒 Result: All tables are now locked. 
-- Any request via PostgREST (anon or authenticated) will return 0 rows 
-- until specific "CREATE POLICY" commands are executed.
