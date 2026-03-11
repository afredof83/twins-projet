-- Enable Realtime for Connection and Opportunity tables
-- This adds the tables to the supabase_realtime publication

BEGIN;
  -- Remove if already exists to avoid duplicates
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS "Connection";
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS "Opportunity";
  
  -- Add tables to the publication
  ALTER PUBLICATION supabase_realtime ADD TABLE "Connection";
  ALTER PUBLICATION supabase_realtime ADD TABLE "Opportunity";
COMMIT;

-- Ensure RLS allows reading these tables for authenticated users
-- (Simple policies for testing, adjust as needed)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view connections' AND tablename = 'Connection') THEN
        CREATE POLICY "Anyone can view connections" ON "Connection" FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view opportunities' AND tablename = 'Opportunity') THEN
        CREATE POLICY "Anyone can view opportunities" ON "Opportunity" FOR SELECT USING (true);
    END IF;
END
$$;
