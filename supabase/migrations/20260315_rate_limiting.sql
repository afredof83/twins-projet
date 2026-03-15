-- 🛡️ Rate Limiting Function for API Endpoints
-- Checks if a user has exceeded the call limit within a specific time window.
-- Uses a table 'api_logs' to track requests (create if not exists).

CREATE TABLE IF NOT EXISTS api_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance on range queries
CREATE INDEX IF NOT EXISTS api_logs_user_endpoint_created_at_idx ON api_logs (user_id, endpoint, created_at);

CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_endpoint TEXT,
    p_max_calls INT,
    p_window_minutes INT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_call_count INT;
BEGIN
    -- 1. Count recent calls
    SELECT COUNT(*) INTO v_call_count
    FROM api_logs
    WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at > (NOW() - (p_window_minutes || ' minutes')::INTERVAL);

    -- 2. Check threshold
    IF v_call_count >= p_max_calls THEN
        RETURN FALSE;
    END IF;

    -- 3. Log the current call (only if allowed)
    INSERT INTO api_logs (user_id, endpoint)
    VALUES (p_user_id, p_endpoint);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
