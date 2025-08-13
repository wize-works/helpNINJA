-- Enhance escalation_rules table for advanced rule conditions
-- This enables sophisticated routing based on multiple criteria

-- Add site_id support for site-specific rules
ALTER TABLE public.escalation_rules ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;

-- Add priority for rule evaluation order
ALTER TABLE public.escalation_rules ADD COLUMN IF NOT EXISTS priority int NOT NULL DEFAULT 0;

-- Add description for rule documentation
ALTER TABLE public.escalation_rules ADD COLUMN IF NOT EXISTS description text;

-- Add rule type for different escalation scenarios
ALTER TABLE public.escalation_rules ADD COLUMN IF NOT EXISTS rule_type text NOT NULL DEFAULT 'escalation' CHECK (rule_type IN ('escalation', 'routing', 'notification'));

-- Create indexes for efficient rule evaluation
CREATE INDEX IF NOT EXISTS escalation_rules_site_idx ON public.escalation_rules(tenant_id, site_id) WHERE site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS escalation_rules_priority_idx ON public.escalation_rules(tenant_id, priority DESC) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS escalation_rules_type_idx ON public.escalation_rules(rule_type) WHERE enabled = true;

-- Create index for rule evaluation performance (enabled rules first, then by priority)
CREATE INDEX IF NOT EXISTS escalation_rules_evaluation_idx ON public.escalation_rules(tenant_id, enabled, priority DESC);

-- Update integration_outbox with more detailed tracking
ALTER TABLE public.integration_outbox ADD COLUMN IF NOT EXISTS rule_id uuid REFERENCES public.escalation_rules(id) ON DELETE SET NULL;
ALTER TABLE public.integration_outbox ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL;
ALTER TABLE public.integration_outbox ADD COLUMN IF NOT EXISTS message_context jsonb DEFAULT '{}'::jsonb;

-- Create index for outbox rule tracking
CREATE INDEX IF NOT EXISTS integration_outbox_rule_idx ON public.integration_outbox(rule_id) WHERE rule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS integration_outbox_conversation_idx ON public.integration_outbox(conversation_id) WHERE conversation_id IS NOT NULL;
