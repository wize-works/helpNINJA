-- Complete HelpNinja Migration Script
-- This script applies all schema changes needed for Phases 1-6
-- Run this against your PostgreSQL database to enable all features

-- Phase 1: Site Management Foundation
-- Create tenant_sites table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tenant_sites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    domain text NOT NULL,
    is_verified boolean NOT NULL DEFAULT false,
    verification_method text CHECK (verification_method IN ('meta_tag', 'dns_txt', 'file_upload')),
    verification_token text,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, domain)
);

-- Add site_id to existing tables if columns don't exist
DO $$
BEGIN
    -- Add site_id to documents
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'site_id') THEN
        ALTER TABLE public.documents ADD COLUMN site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;

    -- Add site_id to chunks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chunks' AND column_name = 'site_id') THEN
        ALTER TABLE public.chunks ADD COLUMN site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;

    -- Add source_id to documents for Phase 3
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'source_id') THEN
        ALTER TABLE public.documents ADD COLUMN source_id uuid REFERENCES public.sources(id) ON DELETE SET NULL;
    END IF;
END
$$;

-- Phase 1: Add indexes
CREATE INDEX IF NOT EXISTS tenant_sites_tenant_idx ON public.tenant_sites(tenant_id);
CREATE INDEX IF NOT EXISTS tenant_sites_domain_idx ON public.tenant_sites(domain);
CREATE INDEX IF NOT EXISTS documents_site_id_idx ON public.documents(site_id);
CREATE INDEX IF NOT EXISTS chunks_site_id_idx ON public.chunks(site_id);

-- Phase 3: Sources enhancement
DO $$
BEGIN
    -- Add site_id to sources if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sources' AND column_name = 'site_id') THEN
        ALTER TABLE public.sources ADD COLUMN site_id uuid;
    END IF;

    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sources_site_id_fkey') THEN
        ALTER TABLE public.sources ADD CONSTRAINT sources_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS sources_site_id_idx ON public.sources (site_id);

-- Phase 3: Enhanced answers table
DO $$
BEGIN
    -- Add site_id column to answers
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'answers' AND column_name = 'site_id') THEN
        ALTER TABLE public.answers ADD COLUMN site_id uuid;
    END IF;

    -- Add foreign key constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'answers_site_id_fkey') THEN
        ALTER TABLE public.answers ADD CONSTRAINT answers_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;

    -- Add priority column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'answers' AND column_name = 'priority') THEN
        ALTER TABLE public.answers ADD COLUMN priority integer NOT NULL DEFAULT 0;
    END IF;

    -- Add status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'answers' AND column_name = 'status') THEN
        ALTER TABLE public.answers ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'disabled'));
    END IF;

    -- Add keywords column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'answers' AND column_name = 'keywords') THEN
        ALTER TABLE public.answers ADD COLUMN keywords text[] DEFAULT '{}';
    END IF;

    -- Add created_at column to answers if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'answers' AND column_name = 'created_at') THEN
        ALTER TABLE public.answers ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
    END IF;

    -- Add question_tsv column for full-text search
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'answers' AND column_name = 'question_tsv') THEN
        ALTER TABLE public.answers ADD COLUMN question_tsv tsvector;
    END IF;
END
$$;

-- Create or replace trigger for question_tsv
CREATE OR REPLACE FUNCTION update_answers_question_tsv() RETURNS TRIGGER AS $$
BEGIN
    NEW.question_tsv := to_tsvector('english', NEW.question);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS answers_question_tsv_update ON public.answers;
CREATE TRIGGER answers_question_tsv_update
BEFORE INSERT OR UPDATE OF question ON public.answers
FOR EACH ROW EXECUTE FUNCTION update_answers_question_tsv();

-- Update existing rows
UPDATE public.answers SET question_tsv = to_tsvector('english', question) WHERE question_tsv IS NULL;

-- Phase 3: Add indexes for answers
CREATE INDEX IF NOT EXISTS answers_site_id_idx ON public.answers (site_id);
CREATE INDEX IF NOT EXISTS answers_priority_idx ON public.answers (priority DESC);
CREATE INDEX IF NOT EXISTS answers_keywords_idx ON public.answers USING gin(keywords);
CREATE INDEX IF NOT EXISTS answers_tags_idx ON public.answers USING gin(tags);
CREATE INDEX IF NOT EXISTS answers_question_tsv_idx ON public.answers USING gin(question_tsv);

-- Phase 4: Enhanced escalation_rules table
DO $$
BEGIN
    -- Add site_id column to escalation_rules
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'escalation_rules' AND column_name = 'site_id') THEN
        ALTER TABLE public.escalation_rules ADD COLUMN site_id uuid;
    END IF;

    -- Add foreign key constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'escalation_rules_site_id_fkey') THEN
        ALTER TABLE public.escalation_rules ADD CONSTRAINT escalation_rules_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;

    -- Add rule_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'escalation_rules' AND column_name = 'rule_type') THEN
        ALTER TABLE public.escalation_rules ADD COLUMN rule_type text NOT NULL DEFAULT 'escalation' CHECK (rule_type IN ('escalation', 'notification', 'routing'));
    END IF;

    -- Add priority column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'escalation_rules' AND column_name = 'priority') THEN
        ALTER TABLE public.escalation_rules ADD COLUMN priority integer NOT NULL DEFAULT 0;
    END IF;

    -- Add status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'escalation_rules' AND column_name = 'status') THEN
        ALTER TABLE public.escalation_rules ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'disabled'));
    END IF;

    -- Add trigger_event column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'escalation_rules' AND column_name = 'trigger_event') THEN
        ALTER TABLE public.escalation_rules ADD COLUMN trigger_event text NOT NULL DEFAULT 'message_received' CHECK (trigger_event IN ('message_received', 'conversation_ended', 'low_confidence'));
    END IF;

    -- Rename 'predicate' to 'conditions' if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'escalation_rules' AND column_name = 'predicate') THEN
        ALTER TABLE public.escalation_rules RENAME COLUMN predicate TO conditions;
    END IF;

    -- Add 'conditions' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'escalation_rules' AND column_name = 'conditions') THEN
        ALTER TABLE public.escalation_rules ADD COLUMN conditions jsonb NOT NULL DEFAULT '{}'::jsonb;
    END IF;

    -- Add last_evaluated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'escalation_rules' AND column_name = 'last_evaluated_at') THEN
        ALTER TABLE public.escalation_rules ADD COLUMN last_evaluated_at timestamptz;
    END IF;
END
$$;

-- Phase 4: Add indexes for escalation_rules
CREATE INDEX IF NOT EXISTS escalation_rules_site_id_idx ON public.escalation_rules (site_id);
CREATE INDEX IF NOT EXISTS escalation_rules_priority_idx ON public.escalation_rules (priority DESC);
CREATE INDEX IF NOT EXISTS escalation_rules_status_idx ON public.escalation_rules (status);
CREATE INDEX IF NOT EXISTS escalation_rules_trigger_event_idx ON public.escalation_rules (trigger_event);

-- Phase 5: Team management enhancements
-- Add more fields to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Enhance tenant_members
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS invited_at timestamptz;
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS joined_at timestamptz;
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended'));

-- Update role constraint
ALTER TABLE public.tenant_members DROP CONSTRAINT IF EXISTS tenant_members_role_check;
ALTER TABLE public.tenant_members ADD CONSTRAINT tenant_members_role_check 
    CHECK (role IN ('owner', 'admin', 'analyst', 'support', 'viewer'));

-- Create team invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL CHECK (role IN ('admin', 'analyst', 'support', 'viewer')),
    invited_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token text UNIQUE NOT NULL,
    expires_at timestamptz NOT NULL,
    accepted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, email)
);

-- Create role permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role text NOT NULL,
    permission text NOT NULL,
    PRIMARY KEY (role, permission)
);

-- Insert default role permissions
INSERT INTO public.role_permissions (role, permission) VALUES
    -- Owner permissions
    ('owner', 'tenant.manage'),
    ('owner', 'users.manage'),
    ('owner', 'sites.manage'),
    ('owner', 'content.manage'),
    ('owner', 'rules.manage'),
    ('owner', 'integrations.manage'),
    ('owner', 'analytics.view'),
    ('owner', 'conversations.manage'),
    ('owner', 'billing.manage'),
    
    -- Admin permissions
    ('admin', 'users.manage'),
    ('admin', 'sites.manage'),
    ('admin', 'content.manage'),
    ('admin', 'rules.manage'),
    ('admin', 'integrations.manage'),
    ('admin', 'analytics.view'),
    ('admin', 'conversations.manage'),
    
    -- Analyst permissions
    ('analyst', 'sites.view'),
    ('analyst', 'content.manage'),
    ('analyst', 'rules.manage'),
    ('analyst', 'analytics.view'),
    ('analyst', 'conversations.view'),
    
    -- Support permissions
    ('support', 'sites.view'),
    ('support', 'content.view'),
    ('support', 'conversations.manage'),
    ('support', 'analytics.view'),
    
    -- Viewer permissions
    ('viewer', 'sites.view'),
    ('viewer', 'content.view'),
    ('viewer', 'conversations.view'),
    ('viewer', 'analytics.view')
ON CONFLICT (role, permission) DO NOTHING;

-- Create team activity log
CREATE TABLE IF NOT EXISTS public.team_activity (
    id bigserial PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    resource_type text,
    resource_id text,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Phase 5: Team management indexes
CREATE INDEX IF NOT EXISTS team_invitations_tenant_idx ON public.team_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS team_invitations_token_idx ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS team_invitations_expires_idx ON public.team_invitations(expires_at);
CREATE INDEX IF NOT EXISTS team_activity_tenant_idx ON public.team_activity(tenant_id);
CREATE INDEX IF NOT EXISTS team_activity_user_idx ON public.team_activity(user_id);
CREATE INDEX IF NOT EXISTS team_activity_created_idx ON public.team_activity(created_at);
CREATE INDEX IF NOT EXISTS tenant_members_tenant_idx ON public.tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS tenant_members_user_idx ON public.tenant_members(user_id);

-- Phase 6: API Management
-- Create API keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    key_type text NOT NULL CHECK (key_type IN ('public', 'secret', 'webhook')) DEFAULT 'secret',
    key_value text UNIQUE NOT NULL,
    key_prefix text NOT NULL,
    permissions text[] DEFAULT '{}',
    last_used_at timestamptz,
    usage_count bigint NOT NULL DEFAULT 0,
    rate_limit_per_hour int DEFAULT 1000,
    expires_at timestamptz,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create webhook endpoints table
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    url text NOT NULL,
    secret text,
    events text[] NOT NULL DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    last_success_at timestamptz,
    last_failure_at timestamptz,
    failure_count int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create webhook deliveries table
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_endpoint_id uuid NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    response_status int,
    response_body text,
    response_headers jsonb,
    delivery_attempts int NOT NULL DEFAULT 1,
    delivered_at timestamptz,
    failed_at timestamptz,
    next_retry_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create API usage logs table
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id bigserial PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
    endpoint text NOT NULL,
    method text NOT NULL,
    status_code int NOT NULL,
    response_time_ms int,
    user_agent text,
    ip_address inet,
    request_size_bytes int,
    response_size_bytes int,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Phase 6: API management indexes
CREATE INDEX IF NOT EXISTS api_keys_tenant_idx ON public.api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS api_keys_value_idx ON public.api_keys(key_value);
CREATE INDEX IF NOT EXISTS api_keys_prefix_idx ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS webhook_endpoints_tenant_idx ON public.webhook_endpoints(tenant_id);
CREATE INDEX IF NOT EXISTS webhook_deliveries_endpoint_idx ON public.webhook_deliveries(webhook_endpoint_id);
CREATE INDEX IF NOT EXISTS webhook_deliveries_created_idx ON public.webhook_deliveries(created_at);
CREATE INDEX IF NOT EXISTS api_usage_logs_tenant_idx ON public.api_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS api_usage_logs_api_key_idx ON public.api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS api_usage_logs_created_idx ON public.api_usage_logs(created_at);

-- Phase 6: Utility functions
-- Function to generate API keys
CREATE OR REPLACE FUNCTION generate_api_key(key_type text DEFAULT 'secret') 
RETURNS text AS $$
DECLARE
    prefix text;
    random_part text;
BEGIN
    CASE key_type
        WHEN 'public' THEN prefix := 'pk_';
        WHEN 'secret' THEN prefix := 'sk_';
        WHEN 'webhook' THEN prefix := 'whk_';
        ELSE prefix := 'key_';
    END CASE;
    
    random_part := encode(gen_random_bytes(24), 'base64');
    random_part := replace(replace(replace(random_part, '+', ''), '/', ''), '=', '');
    random_part := substring(random_part, 1, 32);
    
    RETURN prefix || random_part;
END;
$$ LANGUAGE plpgsql;

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_api_usage(
    p_tenant_id uuid,
    p_api_key_id uuid,
    p_endpoint text,
    p_method text,
    p_status_code int,
    p_response_time_ms int DEFAULT NULL,
    p_user_agent text DEFAULT NULL,
    p_ip_address inet DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO public.api_usage_logs (
        tenant_id, api_key_id, endpoint, method, status_code, 
        response_time_ms, user_agent, ip_address
    ) VALUES (
        p_tenant_id, p_api_key_id, p_endpoint, p_method, p_status_code,
        p_response_time_ms, p_user_agent, p_ip_address
    );
    
    UPDATE public.api_keys 
    SET usage_count = usage_count + 1, last_used_at = NOW()
    WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update user activity
CREATE OR REPLACE FUNCTION update_user_activity(p_user_id uuid, p_tenant_id uuid) 
RETURNS void AS $$
BEGIN
    UPDATE public.tenant_members 
    SET last_active_at = NOW() 
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old API logs
CREATE OR REPLACE FUNCTION cleanup_api_logs(days_to_keep int DEFAULT 90)
RETURNS int AS $$
DECLARE
    deleted_count int;
BEGIN
    DELETE FROM public.api_usage_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Final verification: Display created tables
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'tenant_sites', 'team_invitations', 'role_permissions', 'team_activity',
    'api_keys', 'webhook_endpoints', 'webhook_deliveries', 'api_usage_logs'
)
ORDER BY tablename;

