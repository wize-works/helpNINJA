-- Automatically register webhook endpoints for integrations
-- This ensures escalation rules can properly send notifications through integrations

-- First, add a unique constraint for tenant_id and url if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'webhook_endpoints_tenant_url_key'
        AND conrelid = 'public.webhook_endpoints'::regclass
    ) THEN
        ALTER TABLE public.webhook_endpoints 
        ADD CONSTRAINT webhook_endpoints_tenant_url_key 
        UNIQUE (tenant_id, url);
    END IF;
END$$;

-- Create trigger function to register webhook endpoints for integrations
CREATE OR REPLACE FUNCTION public.register_integration_webhook()
RETURNS TRIGGER AS $$
BEGIN
    -- For new/updated integrations, ensure a webhook endpoint exists
    INSERT INTO public.webhook_endpoints 
    (tenant_id, name, url, is_active, events, created_at, updated_at)
    VALUES 
    (NEW.tenant_id, 
     NEW.provider || ' integration', 
     'internal://integration/' || NEW.provider || '/' || NEW.id,
     true,
     ARRAY['escalation.triggered'], 
     NOW(), 
     NOW())
    ON CONFLICT (tenant_id, url) DO UPDATE
    SET is_active = true,
        updated_at = NOW(),
        events = 
            CASE 
                WHEN webhook_endpoints.events IS NULL THEN ARRAY['escalation.triggered']
                WHEN 'escalation.triggered' = ANY(webhook_endpoints.events) THEN webhook_endpoints.events
                ELSE array_append(webhook_endpoints.events, 'escalation.triggered')
            END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to integrations table
DROP TRIGGER IF EXISTS integration_webhook_registration ON public.integrations;
CREATE TRIGGER integration_webhook_registration
AFTER INSERT OR UPDATE ON public.integrations
FOR EACH ROW EXECUTE FUNCTION public.register_integration_webhook();

-- Register webhooks for existing integrations to ensure all current
-- integrations have webhook endpoints without manual intervention
DO $$
DECLARE
    integration_rec RECORD;
BEGIN
    FOR integration_rec IN 
        SELECT 
            i.tenant_id,
            i.provider,
            i.id
        FROM public.integrations i
    LOOP
        INSERT INTO public.webhook_endpoints 
        (tenant_id, name, url, is_active, events, created_at, updated_at)
        VALUES 
        (integration_rec.tenant_id, 
         integration_rec.provider || ' integration', 
         'internal://integration/' || integration_rec.provider || '/' || integration_rec.id,
         true,
         ARRAY['escalation.triggered'],
         NOW(),
         NOW())
        ON CONFLICT (tenant_id, url) DO UPDATE
        SET is_active = true,
            updated_at = NOW(),
            events = 
                CASE 
                    WHEN webhook_endpoints.events IS NULL THEN ARRAY['escalation.triggered']
                    WHEN 'escalation.triggered' = ANY(webhook_endpoints.events) THEN webhook_endpoints.events
                    ELSE array_append(webhook_endpoints.events, 'escalation.triggered')
                END;
    END LOOP;
END
$$;

-- Add comment to the function for documentation
COMMENT ON FUNCTION public.register_integration_webhook() IS 
'Automatically registers a webhook endpoint when an integration is created or updated. 
This ensures that escalation rules can properly dispatch events to integrations.';