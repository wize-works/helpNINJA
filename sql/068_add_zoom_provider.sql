-- ==============================
-- BEGIN 068_add_zoom_provider.sql
-- ==============================
-- Add 'zoom' to the provider check constraint for integrations table
-- This allows Zoom as a valid provider option alongside existing providers

-- Drop the existing check constraint
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;

-- Add the new check constraint with 'zoom' included
ALTER TABLE public.integrations ADD CONSTRAINT integrations_provider_check 
  CHECK (provider IN (
  'email','slack','teams','discord','zoom',               -- Chat/Communication
  'custom','webhooks',                                     -- Custom integrations
  'zendesk','freshdesk','servicenow','linear',            -- Modern ticketing
  'github','gitlab',                                       -- Developer tools
  'jira','cherwell','zoho',                                -- Enterprise ticketing
  'freshdesk','hubspot','intercom','zendesk'              -- CRM/Support
));

-- Add comment documenting the change
COMMENT ON CONSTRAINT integrations_provider_check ON public.integrations 
IS 'Valid integration providers including chat platforms, ticketing systems, and developer tools';
-- ==============================
-- END 068_add_zoom_provider.sql
-- ==============================