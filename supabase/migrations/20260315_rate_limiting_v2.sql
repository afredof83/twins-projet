-- 🛡️ Rate Limiting Function V2
-- Returns detailed quota information (allowed, remaining, reset_minutes).

CREATE OR REPLACE FUNCTION check_rate_limit_v2(
    p_user_id UUID,
    p_endpoint TEXT,
    p_max_calls INT,
    p_window_minutes INT
)
RETURNS JSONB AS $$
DECLARE
    v_call_count INT;
    v_oldest_call_time TIMESTAMP WITH TIME ZONE;
    v_reset_minutes INT;
BEGIN
    -- 1. Count recent calls
    SELECT COUNT(*) INTO v_call_count
    FROM api_logs
    WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at > (NOW() - (p_window_minutes || ' minutes')::INTERVAL);

    -- 2. Calculate reset time (minutes until the oldest call in the window falls out)
    SELECT created_at INTO v_oldest_call_time
    FROM api_logs
    WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at > (NOW() - (p_window_minutes || ' minutes')::INTERVAL)
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_oldest_call_time IS NOT NULL THEN
        v_reset_minutes := GREATEST(0, EXTRACT(EPOCH FROM (v_oldest_call_time + (p_window_minutes || ' minutes')::INTERVAL - NOW())) / 60)::INT;
    ELSE
        v_reset_minutes := 0;
    END IF;

    -- 3. Check threshold
    IF v_call_count >= p_max_calls THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'remaining', 0,
            'reset_minutes', v_reset_minutes
        );
    END IF;

    -- 4. Log the current call (only if allowed)
    INSERT INTO api_logs (user_id, endpoint)
    VALUES (p_user_id, p_endpoint);

    RETURN jsonb_build_object(
        'allowed', true,
        'remaining', p_max_calls - (v_call_count + 1),
        'reset_minutes', v_reset_minutes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
