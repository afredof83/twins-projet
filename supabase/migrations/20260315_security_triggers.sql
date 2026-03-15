-- 🛡️ Database Security Triggers - Messaging & Connections IDOR Protection
-- Strategy: Use triggers to automatically set participant_ids and verify ownership.

-- 1. Function: Deduce participants for Connections
CREATE OR REPLACE FUNCTION public.handle_connection_participants()
RETURNS TRIGGER AS $$
DECLARE
    u1_id uuid;
    u2_id uuid;
BEGIN
    -- Get user_ids from the profiles table
    SELECT user_id INTO u1_id FROM public.profiles WHERE id = NEW.initiator_id;
    SELECT user_id INTO u2_id FROM public.profiles WHERE id = NEW.receiver_id;

    -- Set the participant_ids array automatically
    NEW.participant_ids := ARRAY[u1_id, u2_id];

    -- Security Check: The caller must be one of the participants
    IF auth.uid() IS NOT NULL AND auth.uid() != u1_id AND auth.uid() != u2_id THEN
        RAISE EXCEPTION 'Unauthorized: User is not a participant of this connection.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function: Deduce participants for Messages (Inherit from Connection)
CREATE OR REPLACE FUNCTION public.handle_message_participants()
RETURNS TRIGGER AS $$
DECLARE
    conn_participants uuid[];
BEGIN
    -- Inherit participant_ids from the parent connection
    SELECT participant_ids INTO conn_participants 
    FROM public.connections 
    WHERE id = NEW.connection_id;

    IF conn_participants IS NULL THEN
        RAISE EXCEPTION 'Invalid connection_id or connection has no participants.';
    END IF;

    NEW.participant_ids := conn_participants;

    -- Security Check: The caller must be one of the participants
    IF auth.uid() IS NOT NULL AND NOT (auth.uid() = ANY(conn_participants)) THEN
        RAISE EXCEPTION 'Unauthorized: User is not a participant of this conversation.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Triggers Registration
-- Connections
DROP TRIGGER IF EXISTS tr_connections_participants ON public.connections;
CREATE TRIGGER tr_connections_participants
    BEFORE INSERT OR UPDATE ON public.connections
    FOR EACH ROW EXECUTE FUNCTION public.handle_connection_participants();

-- Messages
DROP TRIGGER IF EXISTS tr_messages_participants ON public.messages;
CREATE TRIGGER tr_messages_participants
    BEFORE INSERT OR UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_message_participants();

-- 🔒 Security Impact:
-- Clients can no longer forge participant_ids. 
-- Any attempt to post a message to a connection you don't belong to will be blocked by the trigger
-- regardless of the RLS policy bypass (since RLS logic is now reinforced by the Trigger).
