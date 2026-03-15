-- 🚀 Synergy Context V3 - Semantic Aggregation with Threshold
-- Adds p_threshold to filter out irrelevant memories.

CREATE OR REPLACE FUNCTION get_synergy_context_v3(
    p_opportunity_id text,
    p_query_embedding vector,
    p_threshold float DEFAULT 0.6
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
    v_source_id uuid;
    v_target_id uuid;
BEGIN
    -- 1. Identify participants
    SELECT source_id, target_id INTO v_source_id, v_target_id 
    FROM opportunities 
    WHERE id = p_opportunity_id;

    IF v_source_id IS NULL THEN RETURN NULL; END IF;

    -- 2. Build Atomic JSON with Threshold filtering
    SELECT jsonb_build_object(
        'opportunity', o,
        'source_profile', jsonb_build_object('data', sp, 'context', (
            SELECT string_agg(content, '; ') FROM (
                SELECT content FROM memories 
                WHERE profile_id = sp.id 
                AND (1 - (embedding <=> p_query_embedding)) >= p_threshold
                ORDER BY embedding <=> p_query_embedding 
                LIMIT 10
            ) m
        )),
        'target_profile', jsonb_build_object('data', tp, 'context', (
            SELECT string_agg(content, '; ') FROM (
                SELECT content FROM memories 
                WHERE profile_id = tp.id 
                AND (1 - (embedding <=> p_query_embedding)) >= p_threshold
                ORDER BY embedding <=> p_query_embedding 
                LIMIT 10
            ) m
        )),
        'source_cortex', (
            SELECT jsonb_build_object(
                'memories', COALESCE((SELECT jsonb_agg(m.content) FROM (SELECT content FROM memories WHERE profile_id = sp.id AND (1 - (embedding <=> p_query_embedding)) >= p_threshold ORDER BY embedding <=> p_query_embedding LIMIT 10) m), '[]'::jsonb),
                'notes', COALESCE((SELECT jsonb_agg(n.content) FROM (SELECT content FROM cortex_notes WHERE profile_id = sp.id ORDER BY created_at DESC LIMIT 10) n), '[]'::jsonb)
            )
        ),
        'target_cortex', (
            SELECT jsonb_build_object(
                'memories', COALESCE((SELECT jsonb_agg(m.content) FROM (SELECT content FROM memories WHERE profile_id = tp.id AND (1 - (embedding <=> p_query_embedding)) >= p_threshold ORDER BY embedding <=> p_query_embedding LIMIT 10) m), '[]'::jsonb),
                'notes', COALESCE((SELECT jsonb_agg(n.content) FROM (SELECT content FROM cortex_notes WHERE profile_id = tp.id ORDER BY created_at DESC LIMIT 10) n), '[]'::jsonb)
            )
        )
    ) INTO result
    FROM opportunities o
    JOIN profiles sp ON o.source_id = sp.id
    JOIN profiles tp ON o.target_id = tp.id
    WHERE o.id = p_opportunity_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
