-- Add onboarding and company information fields to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS team_size text,
ADD COLUMN IF NOT EXISTS payment_session_id text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tenants_payment_session ON public.tenants(payment_session_id) WHERE payment_session_id IS NOT NULL;

-- Update existing tenants to have updated_at
UPDATE public.tenants SET updated_at = created_at WHERE updated_at IS NULL;
