-- Add site_id support to sources table
-- This allows sources to be associated with specific sites for targeted content

-- Add site_id column to sources table
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;

-- Add index for site_id queries
CREATE INDEX IF NOT EXISTS sources_site_id_idx ON public.sources(site_id) WHERE site_id IS NOT NULL;

-- Add composite index for tenant + site queries
CREATE INDEX IF NOT EXISTS sources_tenant_site_idx ON public.sources(tenant_id, site_id);

-- Update any existing sources to have no site association (they'll be global)
-- No need to do anything since new column will be NULL by default
