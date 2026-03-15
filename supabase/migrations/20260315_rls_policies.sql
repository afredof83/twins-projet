-- 🛡️ Database Security - RLS Policies & Performance Indexing
-- Tables: memories, discoveries, file_archives, cortex_notes, radar_results, opportunities
-- Constraints: Strict auth.uid() owner check, O(log n) performance indexing, anti-spoofing WITH CHECK.

-- 1. Structural Layer: Adding user_id for direct ownership checks
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['memories', 'discoveries', 'file_archives', 'cortex_notes', 'radar_results', 'opportunities'])
    LOOP
        -- Add user_id column linked to auth.users
        EXECUTE format('ALTER TABLE IF EXISTS %I ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE', tbl);
        
        -- Backfill user_id from profile_id mapping
        IF tbl = 'opportunities' THEN
            -- For opportunities, we use the source_id (the creator/discoverer)
            EXECUTE 'UPDATE opportunities t SET user_id = p.user_id::uuid FROM profiles p WHERE t.source_id = p.id AND t.user_id IS NULL';
        ELSE
            EXECUTE format('UPDATE %I t SET user_id = p.user_id::uuid FROM profiles p WHERE t.profile_id = p.id AND t.user_id IS NULL', tbl);
        END IF;

        -- Create INDEX for O(log n) scan complexity on RLS evaluation
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (user_id)', 'idx_' || tbl || '_user_id', tbl);
    END LOOP;
END $$;

-- 2. Policy Layer: Individual Granular Rights (SELECT, INSERT, UPDATE, DELETE)

-- Memories
CREATE POLICY "Memories - Owner Access" ON "memories"
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Discoveries
CREATE POLICY "Discoveries - Owner Access" ON "discoveries"
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- File Archives
CREATE POLICY "File Archives - Owner Access" ON "file_archives"
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Cortex Notes
CREATE POLICY "Cortex Notes - Owner Access" ON "cortex_notes"
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Radar Results
CREATE POLICY "Radar Results - Owner Access" ON "radar_results"
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Opportunities
-- Note: Strict owner check as requested. 
CREATE POLICY "Opportunities - Owner Access" ON "opportunities"
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 💡 Reminder: This migration backfills data but future rows MUST include user_id.
-- Ensure the application code or a database trigger handles setting user_id on INSERT.
