-- Create table to store contact information for conversations
CREATE TABLE IF NOT EXISTS public.conversation_contact_info (
    conversation_id UUID PRIMARY KEY REFERENCES public.conversations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_method TEXT NOT NULL CHECK (contact_method IN ('email', 'phone', 'slack')),
    contact_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table to store pending escalations waiting for contact info
CREATE TABLE IF NOT EXISTS public.pending_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID UNIQUE NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    original_message TEXT NOT NULL,
    assistant_answer TEXT NOT NULL,
    confidence FLOAT,
    refs JSONB DEFAULT '[]',
    reason TEXT NOT NULL,
    rule_id UUID REFERENCES public.escalation_rules(id),
    matched_rule_destinations JSONB,
    keywords JSONB DEFAULT '[]',
    trigger_webhooks BOOLEAN DEFAULT true,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_contact_info_tenant_id ON public.conversation_contact_info(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pending_escalations_conversation_id ON public.pending_escalations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_pending_escalations_created_at ON public.pending_escalations(created_at);

-- Add trigger to update updated_at timestamp for conversation_contact_info
CREATE OR REPLACE FUNCTION update_conversation_contact_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_conversation_contact_info_updated_at
BEFORE UPDATE ON public.conversation_contact_info
FOR EACH ROW
EXECUTE FUNCTION update_conversation_contact_info_updated_at();

-- Add trigger to update updated_at timestamp for pending_escalations
CREATE OR REPLACE FUNCTION update_pending_escalations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_pending_escalations_updated_at
BEFORE UPDATE ON public.pending_escalations
FOR EACH ROW
EXECUTE FUNCTION update_pending_escalations_updated_at();

-- Add comments
COMMENT ON TABLE public.conversation_contact_info IS 'Stores user contact information collected before escalation';
COMMENT ON TABLE public.pending_escalations IS 'Stores escalation context while waiting for user contact information';
COMMENT ON COLUMN public.conversation_contact_info.contact_method IS 'Preferred contact method: email, phone, or slack';
COMMENT ON COLUMN public.conversation_contact_info.contact_value IS 'Contact details (email address, phone number, etc.)';
COMMENT ON COLUMN public.pending_escalations.meta IS 'Additional escalation metadata and context';
