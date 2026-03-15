CREATE OR REPLACE FUNCTION get_synergy_context(p_opportunity_id text)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'opportunity', o,
        'source_profile', jsonb_build_object('data', sp, 'context', (
            SELECT string_agg(content, '; ') FROM (SELECT content FROM memories WHERE profile_id = sp.id ORDER BY created_at DESC LIMIT 10) m
        )),
        'target_profile', jsonb_build_object('data', tp, 'context', (
            SELECT string_agg(content, '; ') FROM (SELECT content FROM memories WHERE profile_id = tp.id ORDER BY created_at DESC LIMIT 10) m
        )),
        'source_cortex', (
            SELECT jsonb_build_object(
                'memories', COALESCE((SELECT jsonb_agg(m.content) FROM (SELECT content FROM memories WHERE profile_id = sp.id ORDER BY created_at DESC LIMIT 10) m), '[]'::jsonb),
                'notes', COALESCE((SELECT jsonb_agg(n.content) FROM (SELECT content FROM cortex_notes WHERE profile_id = sp.id ORDER BY created_at DESC LIMIT 10) n), '[]'::jsonb)
            )
        ),
        'target_cortex', (
            SELECT jsonb_build_object(
                'memories', COALESCE((SELECT jsonb_agg(m.content) FROM (SELECT content FROM memories WHERE profile_id = tp.id ORDER BY created_at DESC LIMIT 10) m), '[]'::jsonb),
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
