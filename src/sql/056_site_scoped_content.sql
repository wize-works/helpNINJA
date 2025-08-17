-- Site-Scoped Content Migration
-- Adds tenant_site_id foreign keys to enable per-site knowledge bases and conversations
-- Run this against your PostgreSQL database to enable site-scoped content

-- Add tenant_site_id to documents table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'documents' 
                   AND column_name = 'tenant_site_id') THEN
        ALTER TABLE public.documents 
        ADD COLUMN tenant_site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add tenant_site_id to chunks table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'chunks' 
                   AND column_name = 'tenant_site_id') THEN
        ALTER TABLE public.chunks 
        ADD COLUMN tenant_site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add tenant_site_id to conversations table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'tenant_site_id') THEN
        ALTER TABLE public.conversations 
        ADD COLUMN tenant_site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add tenant_site_id to messages table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'messages' 
                   AND column_name = 'tenant_site_id') THEN
        ALTER TABLE public.messages 
        ADD COLUMN tenant_site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add tenant_site_id to sources table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'sources') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'sources' 
                       AND column_name = 'tenant_site_id') THEN
            ALTER TABLE public.sources 
            ADD COLUMN tenant_site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS documents_tenant_site_id_idx ON public.documents(tenant_site_id);
CREATE INDEX IF NOT EXISTS chunks_tenant_site_id_idx ON public.chunks(tenant_site_id);
CREATE INDEX IF NOT EXISTS conversations_tenant_site_id_idx ON public.conversations(tenant_site_id);
CREATE INDEX IF NOT EXISTS messages_tenant_site_id_idx ON public.messages(tenant_site_id);

-- Add index for sources if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'sources') THEN
        CREATE INDEX IF NOT EXISTS sources_tenant_site_id_idx ON public.sources(tenant_site_id);
    END IF;
END $$;

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS documents_tenant_site_composite_idx ON public.documents(tenant_id, tenant_site_id);
CREATE INDEX IF NOT EXISTS chunks_tenant_site_composite_idx ON public.chunks(tenant_id, tenant_site_id);
CREATE INDEX IF NOT EXISTS conversations_tenant_site_composite_idx ON public.conversations(tenant_id, tenant_site_id);
CREATE INDEX IF NOT EXISTS messages_tenant_site_composite_idx ON public.messages(tenant_id, tenant_site_id);

-- Update any existing widget-related fields in tenant_sites table if needed
DO $$
BEGIN
    -- Add script_key for widget embedding if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'tenant_sites' 
                   AND column_name = 'script_key') THEN
        ALTER TABLE public.tenant_sites 
        ADD COLUMN script_key text UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64');
        
        -- Generate unique script keys for existing sites
        UPDATE public.tenant_sites 
        SET script_key = encode(gen_random_bytes(24), 'base64') 
        WHERE script_key IS NULL;
    END IF;

    -- Add verification_token if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'tenant_sites' 
                   AND column_name = 'verification_token') THEN
        ALTER TABLE public.tenant_sites 
        ADD COLUMN verification_token text DEFAULT encode(gen_random_bytes(16), 'hex');
        
        -- Generate verification tokens for existing sites
        UPDATE public.tenant_sites 
        SET verification_token = encode(gen_random_bytes(16), 'hex') 
        WHERE verification_token IS NULL;
    END IF;

    -- Add verification_method if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'tenant_sites' 
                   AND column_name = 'verification_method') THEN
        ALTER TABLE public.tenant_sites 
        ADD COLUMN verification_method text CHECK (verification_method IN ('script', 'meta_tag'));
    END IF;

    -- Add status field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'tenant_sites' 
                   AND column_name = 'status') THEN
        ALTER TABLE public.tenant_sites 
        ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'installed', 'verified', 'failed'));
    END IF;
END $$;

-- Display the updated table structure for verification
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('documents', 'chunks', 'conversations', 'messages', 'sources', 'tenant_sites')
AND column_name LIKE '%site%'
ORDER BY table_name, ordinal_position;
