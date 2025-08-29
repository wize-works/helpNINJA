-- Add 'discord' to the provider check constraint for integrations table
-- This allows Discord as a valid provider option alongside existing providers

-- Drop the existing check constraint
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;

-- Add the new check constraint with 'discord' included
ALTER TABLE public.integrations ADD CONSTRAINT integrations_provider_check 
  CHECK (provider IN (
  'email','slack','teams','discord',                    -- Chat/Communication
  'custom','webhooks',                                   -- Custom integrations
  'zendesk','freshdesk','servicenow','linear',         -- Modern ticketing
  'github','gitlab',                                     -- Developer platforms
  'zoho','cherwell','jira'                              -- Legacy/Enterprise
))
