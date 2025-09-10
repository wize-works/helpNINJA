-- Migration: 070_conversation_shares.sql
-- Add support for shareable conversation links

-- Create conversation_shares table
CREATE TABLE IF NOT EXISTS public.conversation_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate active shares per conversation
    UNIQUE(tenant_id, conversation_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS conversation_shares_tenant_id_idx ON public.conversation_shares(tenant_id);
CREATE INDEX IF NOT EXISTS conversation_shares_conversation_id_idx ON public.conversation_shares(conversation_id);
CREATE INDEX IF NOT EXISTS conversation_shares_token_idx ON public.conversation_shares(token);
CREATE INDEX IF NOT EXISTS conversation_shares_expires_at_idx ON public.conversation_shares(expires_at);

-- Function to clean up expired shares
CREATE OR REPLACE FUNCTION cleanup_expired_conversation_shares()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.conversation_shares WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE public.conversation_shares IS 'Shareable links for conversations with expiration';
COMMENT ON COLUMN public.conversation_shares.token IS 'Unique token for accessing shared conversation';
COMMENT ON COLUMN public.conversation_shares.expires_at IS 'When the share link expires';
