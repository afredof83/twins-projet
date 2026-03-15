-- 🛡️ Database Security - Messaging & Connections (Option B: Denormalization)
-- Tables: messages, connections, matches
-- Strategy: Inject participant_ids (UUID[]) + GIN Index for zero-join RLS evaluation.

-- 1. Structural Layer: Adding participant_ids array for multi-owner access
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['messages', 'connections', 'matches'])
    LOOP
        EXECUTE format('ALTER TABLE IF EXISTS %I ADD COLUMN IF NOT EXISTS participant_ids uuid[]', tbl);
    END LOOP;
END $$;

-- 2. Backfill Layer: Populate participant_ids from profile relationships
-- Messages
UPDATE messages m
SET participant_ids = ARRAY[p_send.user_id::uuid, p_recv.user_id::uuid]
FROM profiles p_send, profiles p_recv
WHERE m.sender_id = p_send.id 
  AND m.receiver_id = p_recv.id
  AND m.participant_ids IS NULL;

-- Connections
UPDATE connections c
SET participant_ids = ARRAY[p_init.user_id::uuid, p_recv.user_id::uuid]
FROM profiles p_init, profiles p_recv
WHERE c.initiator_id = p_init.id 
  AND c.receiver_id = p_recv.id
  AND c.participant_ids IS NULL;

-- Matches
UPDATE matches ma
SET participant_ids = ARRAY[p_a.user_id::uuid, p_b.user_id::uuid]
FROM profiles p_a, profiles p_b
WHERE ma.user_a_id = p_a.id 
  AND ma.user_b_id = p_b.id
  AND ma.participant_ids IS NULL;

-- 3. Optimization Layer: GIN Index for O(log n) array membership check
CREATE INDEX IF NOT EXISTS idx_messages_participants_gin ON messages USING GIN (participant_ids);
CREATE INDEX IF NOT EXISTS idx_connections_participants_gin ON connections USING GIN (participant_ids);
CREATE INDEX IF NOT EXISTS idx_matches_participants_gin ON matches USING GIN (participant_ids);

-- 4. Policy Layer: Simple & Fast array check
-- Messages
CREATE POLICY "Messages - Participant Access" ON "messages"
    FOR ALL TO authenticated
    USING (auth.uid() = ANY(participant_ids))
    WITH CHECK (auth.uid() = ANY(participant_ids));

-- Connections
CREATE POLICY "Connections - Participant Access" ON "connections"
    FOR ALL TO authenticated
    USING (auth.uid() = ANY(participant_ids))
    WITH CHECK (auth.uid() = ANY(participant_ids));

-- Matches
CREATE POLICY "Matches - Participant Access" ON "matches"
    FOR ALL TO authenticated
    USING (auth.uid() = ANY(participant_ids))
    WITH CHECK (auth.uid() = ANY(participant_ids));

-- 🔒 Security Note:
-- This denormalization eliminates the need for expensive joins in RLS.
-- Ensure that your application code provides the correct participant_ids array on INSERT.
