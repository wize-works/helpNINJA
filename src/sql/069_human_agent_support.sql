-- Migration: 069_human_agent_support.sql
-- Add support for human agent responses to the messages table

-- Add columns to track human agent responses
DO $$
BEGIN
    -- Add agent_id column to track which agent sent the message
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'agent_id') THEN
        ALTER TABLE public.messages ADD COLUMN agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    -- Add is_human_response column to distinguish human vs AI responses
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'is_human_response') THEN
        ALTER TABLE public.messages ADD COLUMN is_human_response BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    -- Add session_id column to messages table if not exists (for widget polling)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'session_id') THEN
        ALTER TABLE public.messages ADD COLUMN session_id TEXT;
    END IF;
END
$$;

-- Add status column to conversations table for tracking human takeover
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'status') THEN
        ALTER TABLE public.conversations ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'human_handling', 'resolved'));
    END IF;

    -- Add updated_at column to conversations for tracking last activity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'updated_at') THEN
        ALTER TABLE public.conversations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END
$$;

-- Update session_id in existing messages from conversations table
UPDATE public.messages 
SET session_id = c.session_id 
FROM public.conversations c 
WHERE messages.conversation_id = c.id AND messages.session_id IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS messages_agent_id_idx ON public.messages(agent_id);
CREATE INDEX IF NOT EXISTS messages_is_human_response_idx ON public.messages(is_human_response);
CREATE INDEX IF NOT EXISTS messages_session_id_idx ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS conversations_status_idx ON public.conversations(status);

-- Create trigger to update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- Add comments for documentation
COMMENT ON COLUMN public.messages.agent_id IS 'ID of the human agent who sent this message (NULL for AI responses)';
COMMENT ON COLUMN public.messages.is_human_response IS 'TRUE if this message was sent by a human agent, FALSE for AI responses';
COMMENT ON COLUMN public.conversations.status IS 'Conversation status: active, escalated, human_handling, or resolved';
COMMENT ON COLUMN public.conversations.updated_at IS 'Timestamp of last activity in this conversation';
