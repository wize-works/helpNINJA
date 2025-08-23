-- Create escalations table to track all escalation events
CREATE TABLE IF NOT EXISTS public.escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id),
    session_id TEXT,
    reason TEXT NOT NULL,
    confidence FLOAT,
    rule_id UUID REFERENCES public.escalation_rules(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.users(id)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_escalations_tenant_id ON public.escalations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_escalations_conversation_id ON public.escalations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_escalations_created_at ON public.escalations(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_escalations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_escalations_updated_at
BEFORE UPDATE ON public.escalations
FOR EACH ROW
EXECUTE FUNCTION update_escalations_updated_at();

-- Add comment
COMMENT ON TABLE public.escalations IS 'Records all escalation events, whether through rules, low confidence, or manual actions';