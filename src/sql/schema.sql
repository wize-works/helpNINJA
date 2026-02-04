-- Auto-generated consolidated schema file
-- Source: src/sql/*.sql (ordered)
-- Generated at: 2025-09-15T06:16:30.240Z



-- ==============================
-- BEGIN 001_extensions.sql
-- ==============================
create extension if not exists vector;
create extension if not exists pg_trgm;
create extension if not exists rum;
-- ==============================
-- END 001_extensions.sql
-- ==============================


-- ==============================
-- BEGIN 010_schema.sql
-- ==============================
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  public_key text unique not null,
  secret_key text unique not null,
  plan text not null default 'none',
  created_at timestamptz not null default now(),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  plan_status text not null default 'inactive',
);

create table if not exists public.users (
  id uuid primary key,
  email text unique not null,
  clerk_user_id text unique,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
);

create table if not exists public.tenant_members (
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text not null default 'member',
  primary key (tenant_id, user_id)
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null check (kind in ('url', 'sitemap', 'pdf', 'manual')),
  url text,
  title text,
  status text not null default 'ready',
  last_crawled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null,
  url text,
  title text,
  content text not null,
  lang text default 'en',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  url text,
  content text not null,
  token_count int not null,
  embedding vector(3072) not null
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  confidence numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id bigserial primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  question text not null,
  answer text not null,
  tags text[] default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  period_start date not null,
  messages_count int not null default 0,
  last_reset timestamptz not null default now()
);

alter table public.documents add column if not exists tsv tsvector;
update public.documents set tsv = to_tsvector('english', coalesce(title,'') || ' ' || content);
create index if not exists documents_tsv_idx on public.documents using gin (tsv);
-- ==============================
-- END 010_schema.sql
-- ==============================


-- ==============================
-- BEGIN 011_billing.sql
-- ==============================
alter table public.tenants
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan text not null default 'starter',
  add column if not exists plan_status text not null default 'inactive',
  add column if not exists current_period_end timestamptz;

insert into public.usage_counters (tenant_id, period_start, messages_count)
select t.id, date_trunc('month', now())::date, 0
from public.tenants t
left join public.usage_counters u on u.tenant_id = t.id
where u.tenant_id is null;
-- ==============================
-- END 011_billing.sql
-- ==============================


-- ==============================
-- BEGIN 015_onboarding_fields.sql
-- ==============================
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
-- ==============================
-- END 015_onboarding_fields.sql
-- ==============================


-- ==============================
-- BEGIN 015_widget_configurations.sql
-- ==============================
-- Create widget_configurations table
CREATE TABLE IF NOT EXISTS widget_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES tenant_sites(id) ON DELETE CASCADE,
    primary_color VARCHAR(20) NOT NULL DEFAULT '#7C3AED',
    position VARCHAR(20) NOT NULL DEFAULT 'bottom-right',
    welcome_message TEXT NOT NULL DEFAULT '👋 Hi there! How can I help you today?',
    ai_name VARCHAR(100) DEFAULT 'AI Assistant',
    show_branding BOOLEAN DEFAULT TRUE,
    auto_open_delay INTEGER DEFAULT 0,
    button_icon VARCHAR(20) DEFAULT 'default',
    custom_icon_url TEXT,
    theme VARCHAR(10) DEFAULT 'auto',
    font_family VARCHAR(100),
    voice VARCHAR(20) NOT NULL DEFAULT 'friendly',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT widget_config_site_unique UNIQUE (site_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS widget_config_site_id_idx ON widget_configurations(site_id);

-- Add comment to table
COMMENT ON TABLE widget_configurations IS 'Stores site-specific widget customization settings';
-- ==============================
-- END 015_widget_configurations.sql
-- ==============================


-- ==============================
-- BEGIN 020_rls.sql
-- ==============================
alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.tenant_members enable row level security;
alter table public.sources enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.events enable row level security;
alter table public.answers enable row level security;
alter table public.usage_counters enable row level security;

create policy tenant_members_select on public.tenant_members
for select using (true);

create policy tenant_data_select on public.documents
for select using (exists (
  select 1 from public.tenant_members tm
  where tm.tenant_id = documents.tenant_id and tm.user_id = auth.uid()
));

create policy tenant_data_mod on public.documents
for all using (exists (
  select 1 from public.tenant_members tm
  where tm.tenant_id = documents.tenant_id and tm.user_id = auth.uid()
));
-- ==============================
-- END 020_rls.sql
-- ==============================


-- ==============================
-- BEGIN 030_indexes.sql
-- ==============================
create index if not exists chunks_tenant_idx on public.chunks(tenant_id);
create index if not exists chunks_doc_idx on public.chunks(document_id);
create index if not exists chunks_vec_idx on public.chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists messages_conv_idx on public.messages(conversation_id);
-- ==============================
-- END 030_indexes.sql
-- ==============================


-- ==============================
-- BEGIN 040_integrations.sql
-- ==============================
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('email','slack','teams','discord','zoom','freshdesk','zoho','zendesk','cherwell','jira')),
  name text not null,
  status text not null default 'active',
  credentials jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists integrations_tenant_idx on public.integrations(tenant_id);

create table if not exists public.escalation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  predicate jsonb not null default '{}'::jsonb,
  destinations jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists escalation_rules_tenant_idx on public.escalation_rules(tenant_id);

create table if not exists public.integration_outbox (
  id bigserial primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null,
  integration_id uuid references public.integrations(id) on delete set null,
  payload jsonb not null,
  status text not null default 'pending',
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists integration_outbox_pending on public.integration_outbox(status, next_attempt_at);
-- ==============================
-- END 040_integrations.sql
-- ==============================


-- ==============================
-- BEGIN 041_integrations_rls.sql
-- ==============================
alter table public.integrations enable row level security;
alter table public.escalation_rules enable row level security;
alter table public.integration_outbox enable row level security;

create policy integrations_tenant on public.integrations
  for all using (exists (select 1 from public.tenant_members tm where tm.tenant_id = integrations.tenant_id and tm.user_id = auth.uid()));

create policy rules_tenant on public.escalation_rules
  for all using (exists (select 1 from public.tenant_members tm where tm.tenant_id = escalation_rules.tenant_id and tm.user_id = auth.uid()));

create policy outbox_tenant on public.integration_outbox
  for all using (exists (select 1 from public.tenant_members tm where tm.tenant_id = integration_outbox.tenant_id and tm.user_id = auth.uid()));
-- ==============================
-- END 041_integrations_rls.sql
-- ==============================


-- ==============================
-- BEGIN 050_sources_sites.sql
-- ==============================
-- Add site_id support to sources table
-- This allows sources to be associated with specific sites for targeted content

-- Add site_id column to sources table
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;

-- Add index for site_id queries
CREATE INDEX IF NOT EXISTS sources_site_id_idx ON public.sources(site_id) WHERE site_id IS NOT NULL;

-- Add composite index for tenant + site queries
CREATE INDEX IF NOT EXISTS sources_site_idx ON public.sources(tenant_id, site_id);

-- Update any existing sources to have no site association (they'll be global)
-- No need to do anything since new column will be NULL by default
-- ==============================
-- END 050_sources_sites.sql
-- ==============================


-- ==============================
-- BEGIN 051_answers_enhancement.sql
-- ==============================
-- Enhance answers table for curated response management
-- This allows answers to be associated with specific sites and given priority

-- Add missing columns to answers table
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS priority int NOT NULL DEFAULT 0;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'disabled'));
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}';
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS answers_site_idx ON public.answers(tenant_id, site_id);
CREATE INDEX IF NOT EXISTS answers_status_idx ON public.answers(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS answers_priority_idx ON public.answers(priority DESC);
CREATE INDEX IF NOT EXISTS answers_keywords_idx ON public.answers USING gin(keywords);
CREATE INDEX IF NOT EXISTS answers_tags_idx ON public.answers USING gin(tags);

-- Create full-text search index for questions
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS question_tsv tsvector;
UPDATE public.answers SET question_tsv = to_tsvector('english', question);
CREATE INDEX IF NOT EXISTS answers_question_tsv_idx ON public.answers USING gin(question_tsv);

-- Create trigger to update question_tsv automatically
CREATE OR REPLACE FUNCTION update_answers_question_tsv() RETURNS trigger AS $$
BEGIN
    NEW.question_tsv = to_tsvector('english', NEW.question);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS answers_question_tsv_trigger ON public.answers;
CREATE TRIGGER answers_question_tsv_trigger
    BEFORE INSERT OR UPDATE ON public.answers
    FOR EACH ROW EXECUTE FUNCTION update_answers_question_tsv();
-- ==============================
-- END 051_answers_enhancement.sql
-- ==============================


-- ==============================
-- BEGIN 052_escalation_rules_enhancement.sql
-- ==============================
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
-- ==============================
-- END 052_escalation_rules_enhancement.sql
-- ==============================


-- ==============================
-- BEGIN 053_team_management.sql
-- ==============================
-- Enhance team management with invitations, roles, and permissions
-- This enables multi-user support with role-based access control

-- Add more fields to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Enhance tenant_members with more detailed role information
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS invited_at timestamptz;
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS joined_at timestamptz;
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended'));

-- Update role constraint to include all valid roles
ALTER TABLE public.tenant_members DROP CONSTRAINT IF EXISTS tenant_members_role_check;
ALTER TABLE public.tenant_members ADD CONSTRAINT tenant_members_role_check 
    CHECK (role IN ('owner', 'admin', 'analyst', 'support', 'viewer'));

-- Create invitations table for pending team invitations
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

-- Create permissions mapping table for future granular permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role text NOT NULL,
    permission text NOT NULL,
    PRIMARY KEY (role, permission)
);

-- Insert default role permissions
INSERT INTO public.role_permissions (role, permission) VALUES
    -- Owner (full access)
    ('owner', 'tenant.manage'),
    ('owner', 'users.manage'),
    ('owner', 'sites.manage'),
    ('owner', 'content.manage'),
    ('owner', 'rules.manage'),
    ('owner', 'integrations.manage'),
    ('owner', 'analytics.view'),
    ('owner', 'conversations.manage'),
    ('owner', 'billing.manage'),
    
    -- Admin (almost full access, no billing)
    ('admin', 'users.manage'),
    ('admin', 'sites.manage'),
    ('admin', 'content.manage'),
    ('admin', 'rules.manage'),
    ('admin', 'integrations.manage'),
    ('admin', 'analytics.view'),
    ('admin', 'conversations.manage'),
    
    -- Analyst (read/write content and rules, read analytics)
    ('analyst', 'sites.view'),
    ('analyst', 'content.manage'),
    ('analyst', 'rules.manage'),
    ('analyst', 'analytics.view'),
    ('analyst', 'conversations.view'),
    
    -- Support (manage conversations and view content)
    ('support', 'sites.view'),
    ('support', 'content.view'),
    ('support', 'conversations.manage'),
    ('support', 'analytics.view'),
    
    -- Viewer (read-only access)
    ('viewer', 'sites.view'),
    ('viewer', 'content.view'),
    ('viewer', 'conversations.view'),
    ('viewer', 'analytics.view')
ON CONFLICT (role, permission) DO NOTHING;

-- Create activity log for team actions
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS team_invitations_tenant_idx ON public.team_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS team_invitations_token_idx ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS team_invitations_expires_idx ON public.team_invitations(expires_at);
CREATE INDEX IF NOT EXISTS team_activity_tenant_idx ON public.team_activity(tenant_id);
CREATE INDEX IF NOT EXISTS team_activity_user_idx ON public.team_activity(user_id);
CREATE INDEX IF NOT EXISTS team_activity_created_idx ON public.team_activity(created_at);
CREATE INDEX IF NOT EXISTS tenant_members_tenant_idx ON public.tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS tenant_members_user_idx ON public.tenant_members(user_id);

-- Create function to update last_active_at
CREATE OR REPLACE FUNCTION update_user_activity(p_user_id uuid, p_tenant_id uuid) 
RETURNS void AS $$
BEGIN
    UPDATE public.tenant_members 
    SET last_active_at = NOW() 
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;
-- ==============================
-- END 053_team_management.sql
-- ==============================


-- ==============================
-- BEGIN 054_api_management.sql
-- ==============================
-- API Keys and Webhook Management
-- This enables advanced API key management with usage tracking and webhook configuration

-- Create API keys table for advanced key management
CREATE TABLE IF NOT EXISTS public.api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    key_type text NOT NULL CHECK (key_type IN ('public', 'secret', 'webhook')) DEFAULT 'secret',
    key_value text UNIQUE NOT NULL,
    key_prefix text NOT NULL, -- First 8 chars for display (sk_12345678...)
    permissions text[] DEFAULT '{}', -- Specific permissions for this key
    last_used_at timestamptz,
    usage_count bigint NOT NULL DEFAULT 0,
    rate_limit_per_hour int DEFAULT 1000,
    expires_at timestamptz,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create webhook configurations table
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    url text NOT NULL,
    secret text, -- For webhook signature verification
    events text[] NOT NULL DEFAULT '{}', -- Which events to send
    is_active boolean NOT NULL DEFAULT true,
    last_success_at timestamptz,
    last_failure_at timestamptz,
    failure_count int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create webhook deliveries table for tracking
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

-- Create API usage logs for analytics
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS api_keys_tenant_idx ON public.api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS api_keys_value_idx ON public.api_keys(key_value);
CREATE INDEX IF NOT EXISTS api_keys_prefix_idx ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS webhook_endpoints_tenant_idx ON public.webhook_endpoints(tenant_id);
CREATE INDEX IF NOT EXISTS webhook_deliveries_endpoint_idx ON public.webhook_deliveries(webhook_endpoint_id);
CREATE INDEX IF NOT EXISTS webhook_deliveries_created_idx ON public.webhook_deliveries(created_at);
CREATE INDEX IF NOT EXISTS api_usage_logs_tenant_idx ON public.api_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS api_usage_logs_api_key_idx ON public.api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS api_usage_logs_created_idx ON public.api_usage_logs(created_at);

-- Create function to generate API key
CREATE OR REPLACE FUNCTION generate_api_key(key_type text DEFAULT 'secret') 
RETURNS text AS $$
DECLARE
    prefix text;
    random_part text;
BEGIN
    -- Set prefix based on key type
    CASE key_type
        WHEN 'public' THEN prefix := 'pk_';
        WHEN 'secret' THEN prefix := 'sk_';
        WHEN 'webhook' THEN prefix := 'whk_';
        ELSE prefix := 'key_';
    END CASE;
    
    -- Generate random part (32 characters)
    random_part := encode(gen_random_bytes(24), 'base64');
    random_part := replace(replace(replace(random_part, '+', ''), '/', ''), '=', '');
    random_part := substring(random_part, 1, 32);
    
    RETURN prefix || random_part;
END;
$$ LANGUAGE plpgsql;

-- Create function to log API usage
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
    -- Insert usage log
    INSERT INTO public.api_usage_logs (
        tenant_id, api_key_id, endpoint, method, status_code, 
        response_time_ms, user_agent, ip_address
    ) VALUES (
        p_tenant_id, p_api_key_id, p_endpoint, p_method, p_status_code,
        p_response_time_ms, p_user_agent, p_ip_address
    );
    
    -- Update API key usage
    UPDATE public.api_keys 
    SET usage_count = usage_count + 1, last_used_at = NOW()
    WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean old usage logs (for maintenance)
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
-- ==============================
-- END 054_api_management.sql
-- ==============================


-- ==============================
-- BEGIN 055_complete_migration.sql
-- ==============================
-- Complete helpNINJA Migration Script
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
-- ==============================
-- END 055_complete_migration.sql
-- ==============================


-- ==============================
-- BEGIN 056_site_scoped_content.sql
-- ==============================
-- Site-Scoped Content Migration
-- Adds site_id foreign keys to enable per-site knowledge bases and conversations
-- Run this against your PostgreSQL database to enable site-scoped content

-- Add site_id to documents table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'documents' 
                   AND column_name = 'site_id') THEN
        ALTER TABLE public.documents 
        ADD COLUMN site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add site_id to chunks table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'chunks' 
                   AND column_name = 'site_id') THEN
        ALTER TABLE public.chunks 
        ADD COLUMN site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add site_id to conversations table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'conversations' 
                   AND column_name = 'site_id') THEN
        ALTER TABLE public.conversations 
        ADD COLUMN site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add site_id to messages table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'messages' 
                   AND column_name = 'site_id') THEN
        ALTER TABLE public.messages 
        ADD COLUMN site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add site_id to sources table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'sources') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'sources' 
                       AND column_name = 'site_id') THEN
            ALTER TABLE public.sources 
            ADD COLUMN site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS documents_site_id_idx ON public.documents(site_id);
CREATE INDEX IF NOT EXISTS chunks_site_id_idx ON public.chunks(site_id);
CREATE INDEX IF NOT EXISTS conversations_site_id_idx ON public.conversations(site_id);
CREATE INDEX IF NOT EXISTS messages_site_id_idx ON public.messages(site_id);

-- Add index for sources if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'sources') THEN
        CREATE INDEX IF NOT EXISTS sources_site_id_idx ON public.sources(site_id);
    END IF;
END $$;

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS documents_tenant_site_composite_idx ON public.documents(tenant_id, site_id);
CREATE INDEX IF NOT EXISTS chunks_tenant_site_composite_idx ON public.chunks(tenant_id, site_id);
CREATE INDEX IF NOT EXISTS conversations_tenant_site_composite_idx ON public.conversations(tenant_id, site_id);
CREATE INDEX IF NOT EXISTS messages_tenant_site_composite_idx ON public.messages(tenant_id, site_id);

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
-- ==============================
-- END 056_site_scoped_content.sql
-- ==============================


-- ==============================
-- BEGIN 057_telemetry_events.sql
-- ==============================
-- Telemetry Events Table
-- Tracks user interactions for onboarding conversion analysis
-- Run this in Supabase to enable telemetry tracking

CREATE TABLE IF NOT EXISTS public.telemetry_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name text NOT NULL,
    properties jsonb DEFAULT '{}',
    user_id text,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
    session_id text,
    ip_address inet,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS telemetry_events_event_name_idx ON public.telemetry_events(event_name);
CREATE INDEX IF NOT EXISTS telemetry_events_tenant_id_idx ON public.telemetry_events(tenant_id);
CREATE INDEX IF NOT EXISTS telemetry_events_user_id_idx ON public.telemetry_events(user_id);
CREATE INDEX IF NOT EXISTS telemetry_events_created_at_idx ON public.telemetry_events(created_at);
CREATE INDEX IF NOT EXISTS telemetry_events_session_id_idx ON public.telemetry_events(session_id);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS telemetry_events_event_tenant_date_idx 
ON public.telemetry_events(event_name, tenant_id, created_at);

-- Add GIN index for properties queries
CREATE INDEX IF NOT EXISTS telemetry_events_properties_idx 
ON public.telemetry_events USING gin(properties);
-- ==============================
-- END 057_telemetry_events.sql
-- ==============================


-- ==============================
-- BEGIN 058_clerk_mapping.sql
-- ==============================
-- Option A: Inline Clerk IDs on core tables (idempotent)
-- Adds clerk_user_id to users and clerk_org_id to tenants

-- Users: Clerk user mapping
alter table public.users
  add column if not exists clerk_user_id text unique;

create index if not exists users_clerk_user_id_idx on public.users(clerk_user_id);

-- Tenants: Clerk organization mapping
alter table public.tenants
  add column if not exists clerk_org_id text unique;

create index if not exists tenants_clerk_org_id_idx on public.tenants(clerk_org_id);
-- ==============================
-- END 058_clerk_mapping.sql
-- ==============================


-- ==============================
-- BEGIN 058_widget_styling_config.sql
-- ==============================
-- Add additional widget styling options to widget_configurations table
DO $$
BEGIN
    -- Add bubbleBackground if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'bubble_background') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN bubble_background VARCHAR(20) DEFAULT '#111';
    END IF;

    -- Add bubbleColor if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'bubble_color') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN bubble_color VARCHAR(20) DEFAULT '#fff';
    END IF;

    -- Add panelBackground if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'panel_background') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN panel_background VARCHAR(20) DEFAULT '#fff';
    END IF;

    -- Add panelHeaderBackground if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'panel_header_background') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN panel_header_background VARCHAR(20) DEFAULT '#f8fafc';
    END IF;

    -- Add messagesBackground if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'messages_background') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN messages_background VARCHAR(20) DEFAULT '#f8fafc';
    END IF;

    -- Add userBubbleBackground if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'user_bubble_background') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN user_bubble_background VARCHAR(20) DEFAULT '#3b82f6';
    END IF;

    -- Add userBubbleColor if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'user_bubble_color') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN user_bubble_color VARCHAR(20) DEFAULT '#fff';
    END IF;

    -- Add assistantBubbleBackground if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'assistant_bubble_background') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN assistant_bubble_background VARCHAR(20) DEFAULT '#e5e7eb';
    END IF;

    -- Add assistantBubbleColor if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'assistant_bubble_color') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN assistant_bubble_color VARCHAR(20) DEFAULT '#111';
    END IF;

    -- Add buttonBackground if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'button_background') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN button_background VARCHAR(20) DEFAULT '#111';
    END IF;

    -- Add buttonColor if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'button_color') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN button_color VARCHAR(20) DEFAULT '#fff';
    END IF;

    -- Add advanced_colors if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'advanced_colors') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN advanced_colors boolean DEFAULT false;
    END IF;
END
$$;

-- Update the primary_color description to clarify its use
COMMENT ON COLUMN widget_configurations.primary_color IS 'Legacy primary color (used for branding)';
COMMENT ON COLUMN widget_configurations.advanced_colors IS 'Enalbe advanced colors for branding';

-- Add comments to new columns
COMMENT ON COLUMN widget_configurations.bubble_background IS 'Background color of the chat bubble';
COMMENT ON COLUMN widget_configurations.bubble_color IS 'Text/icon color of the chat bubble';
COMMENT ON COLUMN widget_configurations.panel_background IS 'Background color of the main chat panel';
COMMENT ON COLUMN widget_configurations.panel_header_background IS 'Background color of the chat panel header';
COMMENT ON COLUMN widget_configurations.messages_background IS 'Background color of the messages area';
COMMENT ON COLUMN widget_configurations.user_bubble_background IS 'Background color of user message bubbles';
COMMENT ON COLUMN widget_configurations.user_bubble_color IS 'Text color of user message bubbles';
COMMENT ON COLUMN widget_configurations.assistant_bubble_background IS 'Background color of assistant message bubbles';
COMMENT ON COLUMN widget_configurations.assistant_bubble_color IS 'Text color of assistant message bubbles';
COMMENT ON COLUMN widget_configurations.button_background IS 'Background color of the send button';
COMMENT ON COLUMN widget_configurations.button_color IS 'Text color of the send button';

-- Update the schema version
INSERT INTO schema_migrations (version) VALUES ('058_widget_styling_config') ON CONFLICT DO NOTHING;
-- ==============================
-- END 058_widget_styling_config.sql
-- ==============================


-- ==============================
-- BEGIN 059_fix_plan_status_constraint.sql
-- ==============================
-- Fix plan_status constraint to allow inactive status for new Clerk organizations
-- This ensures that organizations created via Clerk webhooks start as 'inactive' 
-- until they complete onboarding and payment

-- First, check if there's an existing constraint and drop it
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants' 
        AND constraint_name = 'tenants_plan_status_check'
    ) THEN
        ALTER TABLE public.tenants DROP CONSTRAINT tenants_plan_status_check;
    END IF;
END $$;

-- Add the correct constraint that allows all expected values
ALTER TABLE public.tenants 
ADD CONSTRAINT tenants_plan_status_check 
CHECK (plan_status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled'));

-- Update the default to 'inactive' to match the intended behavior
-- (Users should start inactive until they complete payment)
ALTER TABLE public.tenants 
ALTER COLUMN plan_status SET DEFAULT 'inactive';
-- ==============================
-- END 059_fix_plan_status_constraint.sql
-- ==============================


-- ==============================
-- BEGIN 060_add_none_plan.sql
-- ==============================
-- Migration to add 'none' plan option and update constraints
-- This allows organizations created via Clerk to have a proper "no plan selected" state

-- First, check if there's an existing plan constraint and drop it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'tenants' 
        AND constraint_name = 'tenants_plan_check'
    ) THEN
        ALTER TABLE public.tenants DROP CONSTRAINT tenants_plan_check;
    END IF;
END $$;

-- Add the updated plan constraint that includes 'none'
ALTER TABLE public.tenants 
ADD CONSTRAINT tenants_plan_check 
    CHECK (plan IN ('none', 'starter', 'pro', 'agency'));

-- Update the default value for new organizations
ALTER TABLE public.tenants 
ALTER COLUMN plan SET DEFAULT 'none';

-- Note: We don't update existing 'starter' plan organizations because they
-- may have been legitimately set up with starter plan access. Only new
-- organizations created via Clerk webhook will get 'none' plan by default.
-- ==============================
-- END 060_add_none_plan.sql
-- ==============================


-- ==============================
-- BEGIN 061_register_integration_webhook.sql
-- ==============================
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
-- ==============================
-- END 061_register_integration_webhook.sql
-- ==============================


-- ==============================
-- BEGIN 062_escalations.sql
-- ==============================
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
-- ==============================
-- END 062_escalations.sql
-- ==============================


-- ==============================
-- BEGIN 063_notifications.sql
-- ==============================
-- Notifications & Preferences (MVP)
-- Creates core tables for in-app notification feed

-- notification types and severities enforced via CHECK constraints (soft enums)
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type text NOT NULL,
    severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','error','critical')),
    title text NOT NULL,
    body text,
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    source text NOT NULL DEFAULT 'system',
    event_key text, -- for dedupe (e.g. integration_failed:slack:123)
    group_key text, -- for batching similar events in UI (e.g. ingest:success:batch123)
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    UNIQUE(tenant_id, event_key, created_at)
);

CREATE INDEX IF NOT EXISTS notifications_tenant_idx ON public.notifications(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_event_key_idx ON public.notifications(event_key);
CREATE INDEX IF NOT EXISTS notifications_group_key_idx ON public.notifications(group_key);

-- Per-recipient delivery & read tracking. user_id NULL => broadcast (all current & future members)
CREATE TABLE IF NOT EXISTS public.notification_recipients (
    notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    read_at timestamptz,
    delivered_channels text[] DEFAULT '{}',
    PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS notification_recipients_user_idx ON public.notification_recipients(user_id, read_at);

-- User / tenant preferences per channel & type (wildcard '*')
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    channel text NOT NULL CHECK (channel IN ('in_app','email','slack')),
    type text NOT NULL, -- specific notification type or '*'
    enabled boolean NOT NULL DEFAULT true,
    throttle_window_secs int DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id, channel, type)
);

CREATE INDEX IF NOT EXISTS notification_prefs_user_idx ON public.notification_preferences(user_id);

COMMENT ON TABLE public.notifications IS 'Canonical notification objects (one per event – recipient fanout stored separately).';
COMMENT ON TABLE public.notification_recipients IS 'Recipient read status & channel delivery metadata for notifications.';
COMMENT ON TABLE public.notification_preferences IS 'Per-user channel + type preference & throttling rules.';
-- ==============================
-- END 063_notifications.sql
-- ==============================


-- ==============================
-- BEGIN 064_add_site_id_to_conversations.sql
-- ==============================
-- Migration: add site_id to conversations (supersedes older tenant_site_id naming) and backfill
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='conversations' AND column_name='site_id'
    ) THEN
        ALTER TABLE public.conversations ADD COLUMN site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;

    -- Backfill from tenant_site_id if site_id is null and legacy column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='conversations' AND column_name='tenant_site_id'
    ) THEN
        UPDATE public.conversations c
        SET site_id = c.tenant_site_id
        WHERE c.site_id IS NULL AND c.tenant_site_id IS NOT NULL;
    END IF;
END $$;

-- Helpful index if not already present
CREATE INDEX IF NOT EXISTS conversations_site_id_idx ON public.conversations(site_id);
CREATE INDEX IF NOT EXISTS conversations_tenant_site_composite2_idx ON public.conversations(tenant_id, site_id);

-- Ensure messages table has site_id (some earlier environments may have missed prior migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='messages' AND column_name='site_id'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;

    -- Backfill messages.site_id from legacy tenant_site_id if present
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='messages' AND column_name='tenant_site_id'
    ) THEN
        UPDATE public.messages m
        SET site_id = m.tenant_site_id
        WHERE m.site_id IS NULL AND m.tenant_site_id IS NOT NULL;
    END IF;

    -- Backfill messages.site_id from conversations.site_id
    UPDATE public.messages m
    SET site_id = c.site_id
    FROM public.conversations c
    WHERE m.conversation_id = c.id
      AND m.site_id IS NULL
      AND c.site_id IS NOT NULL;
END $$;

-- Helpful indexes for messages if not present
CREATE INDEX IF NOT EXISTS messages_site_id_idx ON public.messages(site_id);
CREATE INDEX IF NOT EXISTS messages_tenant_site_composite2_idx ON public.messages(tenant_id, site_id);
-- ==============================
-- END 064_add_site_id_to_conversations.sql
-- ==============================


-- ==============================
-- BEGIN 065_events_indexes.sql
-- ==============================
-- Events table indexing & commentary
-- Adds composite indexes to support common analytics query patterns

DO $$ BEGIN
    -- (tenant_id, name, created_at DESC) for per-event time series & rate computations
    CREATE INDEX IF NOT EXISTS events_tenant_name_created_idx ON public.events (tenant_id, name, created_at DESC);
    -- (tenant_id, created_at DESC) for recent activity feed / rolling windows
    CREATE INDEX IF NOT EXISTS events_tenant_created_idx ON public.events (tenant_id, created_at DESC);
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Events index creation skipped: %', SQLERRM;
END $$;

COMMENT ON TABLE public.events IS 'Flexible analytics & audit event log (conversation, escalation, billing, ingestion, limits)';
COMMENT ON COLUMN public.events.name IS 'Event name (see src/lib/events.ts EventName union)';
COMMENT ON COLUMN public.events.data IS 'Structured JSON payload (<=2KB, truncated if larger)';
-- ==============================
-- END 065_events_indexes.sql
-- ==============================


-- ==============================
-- BEGIN 066_contact_info_and_pending_escalations.sql
-- ==============================
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
-- ==============================
-- END 066_contact_info_and_pending_escalations.sql
-- ==============================


-- ==============================
-- BEGIN 067_add_discord_provider.sql
-- ==============================
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
-- ==============================
-- END 067_add_discord_provider.sql
-- ==============================


-- ==============================
-- BEGIN 068_feedback_system.sql
-- ==============================
-- Create feedback system tables for user feedback and feature requests
-- Migration: 068_feedback_system.sql

-- Main feedback table to store user feedback and feature requests
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL, -- Optional link to conversation
    session_id TEXT, -- Widget session ID for anonymous feedback
    
    -- Feedback classification
    type TEXT NOT NULL CHECK (type IN ('bug', 'feature_request', 'improvement', 'general', 'ui_ux', 'performance')),
    category TEXT, -- Optional subcategory (e.g., 'widget', 'dashboard', 'api', 'integrations')
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'planned', 'in_progress', 'completed', 'rejected', 'duplicate')),
    
    -- Content
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    steps_to_reproduce TEXT, -- For bug reports
    expected_behavior TEXT, -- For bug reports
    actual_behavior TEXT, -- For bug reports
    
    -- User information (optional for anonymous feedback)
    user_name TEXT,
    user_email TEXT,
    contact_method TEXT CHECK (contact_method IS NULL OR contact_method IN ('email', 'phone', 'slack', 'none')),
    contact_value TEXT,
    
    -- Technical context
    user_agent TEXT,
    url TEXT, -- Page where feedback was submitted
    widget_version TEXT,
    browser_info JSONB,
    
    -- Metadata and tracking
    tags TEXT[], -- Searchable tags
    votes INTEGER DEFAULT 0, -- Community voting (future feature)
    internal_notes TEXT, -- Admin/dev notes
    related_feedback_ids UUID[], -- Related feedback items
    metadata JSONB DEFAULT '{}', -- Flexible metadata storage
    
    -- Escalation tracking
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalation_rule_id UUID REFERENCES public.escalation_rules(id),
    escalated_to JSONB, -- Track which integrations were notified
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Feedback attachments table for screenshots, files, etc.
CREATE TABLE IF NOT EXISTS public.feedback_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL, -- Path to stored file
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback comments/updates table for internal tracking and user communication
CREATE TABLE IF NOT EXISTS public.feedback_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
    author_type TEXT NOT NULL CHECK (author_type IN ('user', 'admin', 'system')),
    author_name TEXT,
    author_email TEXT,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false, -- Internal admin comments vs user-visible
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_tenant_id ON public.feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_conversation_id ON public.feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session_id ON public.feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_priority ON public.feedback(priority);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_tenant_status ON public.feedback(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_tenant_type ON public.feedback(tenant_id, type);

-- GIN indexes for JSONB and array columns
CREATE INDEX IF NOT EXISTS idx_feedback_tags ON public.feedback USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_feedback_metadata ON public.feedback USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_feedback_browser_info ON public.feedback USING GIN(browser_info);

-- Indexes for attachments and comments
CREATE INDEX IF NOT EXISTS idx_feedback_attachments_feedback_id ON public.feedback_attachments(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_feedback_id ON public.feedback_comments(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_created_at ON public.feedback_comments(created_at);

-- Add full-text search on feedback content
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS search_vector tsvector 
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(steps_to_reproduce, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(expected_behavior, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(actual_behavior, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(internal_notes, '')), 'D')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_feedback_search_vector ON public.feedback USING GIN(search_vector);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_feedback_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_updated_at();

-- Function to automatically escalate high-priority feedback
CREATE OR REPLACE FUNCTION auto_escalate_feedback()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-escalate urgent feedback or bugs
    IF NEW.priority = 'urgent' OR (NEW.type = 'bug' AND NEW.priority = 'high') THEN
        -- Mark as escalated (actual escalation will be handled by application code)
        NEW.escalated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_auto_escalate_feedback
    BEFORE INSERT ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION auto_escalate_feedback();

-- Create view for feedback analytics
CREATE OR REPLACE VIEW public.feedback_analytics AS
SELECT 
    tenant_id,
    type,
    status,
    priority,
    COUNT(*) as feedback_count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as feedback_last_30_days,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE escalated_at IS NOT NULL) as escalated_count,
    AVG(EXTRACT(epoch FROM (resolved_at - created_at))/3600)::integer as avg_resolution_hours,
    DATE_TRUNC('month', created_at) as month
FROM public.feedback
GROUP BY tenant_id, type, status, priority, DATE_TRUNC('month', created_at);

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON public.feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.feedback_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.feedback_comments TO authenticated;
GRANT SELECT ON public.feedback_analytics TO authenticated;

-- Add RLS policies (Row Level Security)
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access feedback for their tenant
CREATE POLICY feedback_tenant_isolation ON public.feedback
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY feedback_attachments_tenant_isolation ON public.feedback_attachments
    FOR ALL USING (
        feedback_id IN (
            SELECT id FROM public.feedback 
            WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
        )
    );

CREATE POLICY feedback_comments_tenant_isolation ON public.feedback_comments
    FOR ALL USING (
        feedback_id IN (
            SELECT id FROM public.feedback 
            WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
        )
    );

-- Insert sample feedback categories for reference
INSERT INTO public.feedback (
    id, tenant_id, type, category, title, description, priority, status, 
    user_name, created_at
) VALUES 
    (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000000', -- System tenant for examples
        'feature_request',
        'widget',
        'Sample: Dark mode for chat widget',
        'It would be great if the chat widget had a dark mode option to match our website theme.',
        'medium',
        'open',
        'System Example',
        NOW()
    ),
    (
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000000',
        'bug',
        'dashboard',
        'Sample: Analytics not updating in real-time',
        'The analytics dashboard shows outdated information and requires a page refresh to see new data.',
        'high',
        'in_review',
        'System Example',
        NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.feedback IS 'Stores user feedback, feature requests, and bug reports';
COMMENT ON TABLE public.feedback_attachments IS 'File attachments for feedback items (screenshots, logs, etc.)';
COMMENT ON TABLE public.feedback_comments IS 'Comments and updates on feedback items for tracking and communication';
COMMENT ON VIEW public.feedback_analytics IS 'Aggregated analytics view for feedback reporting and insights';
-- ==============================
-- END 068_feedback_system.sql
-- ==============================


-- ==============================
-- BEGIN 069_add_panel_colors.sql
-- ==============================
-- Add panel text color fields to widget_configurations table
DO $$
BEGIN
    -- Add panel_color if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'panel_color') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN panel_color VARCHAR(20) DEFAULT '#333333';
    END IF;

    -- Add panel_header_color if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'panel_header_color') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN panel_header_color VARCHAR(20) DEFAULT '#ffffff';
    END IF;
END
$$;

-- Add comments to new columns
COMMENT ON COLUMN widget_configurations.panel_color IS 'Text color for the main chat panel';
COMMENT ON COLUMN widget_configurations.panel_header_color IS 'Text color for the chat panel header';

-- Update the schema version
INSERT INTO schema_migrations (version) VALUES ('069_add_panel_colors') ON CONFLICT DO NOTHING;
-- ==============================
-- END 069_add_panel_colors.sql
-- ==============================


-- ==============================
-- BEGIN 069_human_agent_support.sql
-- ==============================
-- Migration: 069_human_agent_support.sql
-- Add support for human agent responses to the messages table

-- Add columns to track human agent responses
DO $$
BEGIN
    -- Add agent_id column to track which agent sent the message
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'agent_id') THEN
        ALTER TABLE public.messages ADD COLUMN agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    -- Add is_human_response column to distinguish human vs AI responses
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'is_human_response') THEN
        ALTER TABLE public.messages ADD COLUMN is_human_response BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    -- Add session_id column to messages table if not exists (for widget polling)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'session_id') THEN
        ALTER TABLE public.messages ADD COLUMN session_id TEXT;
    END IF;
END
$$;

-- Add status column to conversations table for tracking human takeover
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'status') THEN
        ALTER TABLE public.conversations ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'human_handling', 'resolved'));
    END IF;

    -- Add updated_at column to conversations for tracking last activity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'updated_at') THEN
        ALTER TABLE public.conversations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END
$$;

-- Update session_id in existing messages from conversations table
UPDATE public.messages 
SET session_id = c.session_id 
FROM public.conversations c 
WHERE messages.conversation_id = c.id AND messages.session_id IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS messages_agent_id_idx ON public.messages(agent_id);
CREATE INDEX IF NOT EXISTS messages_is_human_response_idx ON public.messages(is_human_response);
CREATE INDEX IF NOT EXISTS messages_session_id_idx ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS conversations_status_idx ON public.conversations(status);

-- Create trigger to update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- Add comments for documentation
COMMENT ON COLUMN public.messages.agent_id IS 'ID of the human agent who sent this message (NULL for AI responses)';
COMMENT ON COLUMN public.messages.is_human_response IS 'TRUE if this message was sent by a human agent, FALSE for AI responses';
COMMENT ON COLUMN public.conversations.status IS 'Conversation status: active, escalated, human_handling, or resolved';
COMMENT ON COLUMN public.conversations.updated_at IS 'Timestamp of last activity in this conversation';
-- ==============================
-- END 069_human_agent_support.sql
-- ==============================


-- ==============================
-- BEGIN 069_pending_memberships.sql
-- ==============================
-- Migration: Add pending tenant memberships table
-- Date: 2024-12-XX
-- Description: Creates table to track accepted invitations pending user signup

-- Create pending_tenant_memberships table
CREATE TABLE IF NOT EXISTS public.pending_tenant_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('admin', 'analyst', 'support', 'viewer')),
    invitation_id uuid REFERENCES public.team_invitations(id) ON DELETE SET NULL,
    first_name text,
    last_name text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    activated_at timestamptz,
    
    -- Unique constraint to prevent duplicate pending memberships
    UNIQUE(email, tenant_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_pending_memberships_email ON public.pending_tenant_memberships(email);
CREATE INDEX IF NOT EXISTS idx_pending_memberships_tenant_id ON public.pending_tenant_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pending_memberships_invitation_id ON public.pending_tenant_memberships(invitation_id);
CREATE INDEX IF NOT EXISTS idx_pending_memberships_created_at ON public.pending_tenant_memberships(created_at);

-- Add comment to table
COMMENT ON TABLE public.pending_tenant_memberships IS 'Tracks accepted invitations that are pending user signup completion';

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_tenant_memberships TO authenticated;
GRANT ALL ON public.pending_tenant_memberships TO service_role;

-- Add RLS policy
ALTER TABLE public.pending_tenant_memberships ENABLE ROW LEVEL SECURITY;

-- Policy: Only allow access to pending memberships for the tenant context
CREATE POLICY pending_memberships_tenant_isolation ON public.pending_tenant_memberships
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
-- ==============================
-- END 069_pending_memberships.sql
-- ==============================


-- ==============================
-- BEGIN 070_consolidate_invitations.sql
-- ==============================
-- Migration: Consolidate invitation system into tenant_member_invitations
-- Date: 2024-12-XX
-- Description: Replaces team_invitations and pending_tenant_memberships with a single, properly named table

-- Create the new consolidated invitation table
CREATE TABLE IF NOT EXISTS public.tenant_member_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'analyst', 'support', 'viewer')),
    invited_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Contact info (optional, captured during acceptance)
    first_name text,
    last_name text,
    
    -- Invitation lifecycle
    token text UNIQUE NOT NULL,
    expires_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'expired', 'cancelled')),
    
    -- Timestamps for lifecycle tracking
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz,     -- When user clicked invitation link
    completed_at timestamptz,    -- When user signed up and became member
    
    -- Optional message from inviter
    message text,
    
    -- Ensure one invitation per email per tenant
    UNIQUE(tenant_id, email)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tenant_member_invitations_tenant_id ON public.tenant_member_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_member_invitations_email ON public.tenant_member_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_member_invitations_status ON public.tenant_member_invitations(status);
CREATE INDEX IF NOT EXISTS idx_tenant_member_invitations_created_at ON public.tenant_member_invitations(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_member_invitations_expires_at ON public.tenant_member_invitations(expires_at);

-- Add comment
COMMENT ON TABLE public.tenant_member_invitations IS 'Complete invitation lifecycle for tenant membership - from invitation through signup completion';

-- Add column comments for clarity
COMMENT ON COLUMN public.tenant_member_invitations.status IS 'pending: invitation sent, accepted: user clicked link, completed: user signed up, expired: past expiry, cancelled: manually cancelled';
COMMENT ON COLUMN public.tenant_member_invitations.accepted_at IS 'When user clicked the invitation link (may not have signed up yet)';
COMMENT ON COLUMN public.tenant_member_invitations.completed_at IS 'When user completed signup and became an active tenant member';

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_member_invitations TO authenticated;
GRANT ALL ON public.tenant_member_invitations TO service_role;

-- Add RLS policy
ALTER TABLE public.tenant_member_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Only allow access to invitations for the current tenant context
CREATE POLICY tenant_member_invitations_isolation ON public.tenant_member_invitations
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Migrate existing data from team_invitations if it exists
INSERT INTO public.tenant_member_invitations 
    (tenant_id, email, role, invited_by, token, expires_at, status, created_at, accepted_at)
SELECT 
    tenant_id, 
    email, 
    role, 
    invited_by, 
    token, 
    expires_at,
    CASE 
        WHEN accepted_at IS NOT NULL THEN 'accepted'
        WHEN expires_at < NOW() THEN 'expired'
        ELSE 'pending'
    END as status,
    created_at,
    accepted_at
FROM public.team_invitations
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_invitations')
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Migrate pending memberships if they exist
UPDATE public.tenant_member_invitations 
SET 
    first_name = pm.first_name,
    last_name = pm.last_name,
    status = CASE WHEN pm.activated_at IS NOT NULL THEN 'completed' ELSE 'accepted' END,
    completed_at = pm.activated_at
FROM public.pending_tenant_memberships pm
WHERE tenant_member_invitations.email = pm.email 
    AND tenant_member_invitations.tenant_id = pm.tenant_id
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pending_tenant_memberships');

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION update_tenant_member_invitation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_tenant_member_invitation_updated_at
    BEFORE UPDATE ON public.tenant_member_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_member_invitation_updated_at();

-- Drop old tables after migration (commented out for safety)
-- DROP TABLE IF EXISTS public.pending_tenant_memberships CASCADE;
-- DROP TABLE IF EXISTS public.team_invitations CASCADE;
-- ==============================
-- END 070_consolidate_invitations.sql
-- ==============================


-- ==============================
-- BEGIN 070_conversation_shares.sql
-- ==============================
-- Migration: 070_conversation_shares.sql
-- Add support for shareable conversation links

-- Create conversation_shares table
CREATE TABLE IF NOT EXISTS public.conversation_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate active shares per conversation
    UNIQUE(tenant_id, conversation_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS conversation_shares_tenant_id_idx ON public.conversation_shares(tenant_id);
CREATE INDEX IF NOT EXISTS conversation_shares_conversation_id_idx ON public.conversation_shares(conversation_id);
CREATE INDEX IF NOT EXISTS conversation_shares_token_idx ON public.conversation_shares(token);
CREATE INDEX IF NOT EXISTS conversation_shares_expires_at_idx ON public.conversation_shares(expires_at);

-- Function to clean up expired shares
CREATE OR REPLACE FUNCTION cleanup_expired_conversation_shares()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.conversation_shares WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE public.conversation_shares IS 'Shareable links for conversations with expiration';
COMMENT ON COLUMN public.conversation_shares.token IS 'Unique token for accessing shared conversation';
COMMENT ON COLUMN public.conversation_shares.expires_at IS 'When the share link expires';
-- ==============================
-- END 070_conversation_shares.sql
-- ==============================


-- ==============================
-- BEGIN 073_update_theme_auto_to_system.sql
-- ==============================
-- Update theme field from 'auto' to 'system' for consistency
-- Migration to standardize theme naming across the application

-- Update existing records that have 'auto' theme to 'system'
UPDATE widget_configurations 
SET theme = 'system' 
WHERE theme = 'auto';

-- Update the default value for the theme column
ALTER TABLE widget_configurations 
ALTER COLUMN theme SET DEFAULT 'system';

-- Add a comment to document the change
COMMENT ON COLUMN widget_configurations.theme IS 'Widget theme setting: light, dark, or system (follows user preference)';
-- ==============================
-- END 073_update_theme_auto_to_system.sql
-- ==============================


-- ==============================
-- BEGIN 074_fix_users_id_default.sql
-- ==============================
-- Fix users table id column to have default UUID generator
-- This resolves the "null value in column id violates not-null constraint" error
-- when creating new users in the invitation acceptance flow

ALTER TABLE public.users 
ALTER COLUMN id SET DEFAULT gen_random_uuid();
-- ==============================
-- END 074_fix_users_id_default.sql
-- ==============================


-- ==============================
-- BEGIN audit_logs_migration.sql
-- ==============================
-- Migration: Add audit logging support
-- Date: 2024-11-XX
-- Description: Creates audit_logs table and related indexes for comprehensive audit trails

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id UUID,  -- Allow NULL for system-level operations
    user_id UUID,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints if the referenced tables exist
DO $$ 
BEGIN
    -- Add tenant_id foreign key if tenants table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        ALTER TABLE public.audit_logs 
        ADD CONSTRAINT fk_audit_logs_tenant_id 
        FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;
    
    -- Add user_id foreign key if users table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        ALTER TABLE public.audit_logs 
        ADD CONSTRAINT fk_audit_logs_user_id 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON public.audit_logs(resource_id);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON public.audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_action ON public.audit_logs(tenant_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_user ON public.audit_logs(tenant_id, user_id, created_at DESC);

-- Add comment to table
COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit trail for all tenant activities';

-- Add comments to important columns
COMMENT ON COLUMN public.audit_logs.action IS 'Type of action performed (e.g., api_key_created, team_member_invited)';
COMMENT ON COLUMN public.audit_logs.resource_type IS 'Type of resource affected (e.g., api_key, team_member, billing)';
COMMENT ON COLUMN public.audit_logs.resource_id IS 'ID of the specific resource affected';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Additional context and details about the action';
COMMENT ON COLUMN public.audit_logs.success IS 'Whether the action was successful';

-- Create function to automatically clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.audit_logs 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup action with NULL tenant_id for system operations
    INSERT INTO public.audit_logs (
        tenant_id, 
        action, 
        resource_type, 
        metadata, 
        created_at
    ) VALUES (
        NULL, -- System operations use NULL tenant_id
        'system_cleanup',
        'audit_logs',
        jsonb_build_object(
            'deleted_count', deleted_count,
            'retention_days', retention_days
        ),
        NOW()
    );
    
    RETURN deleted_count;
END;
$$;

-- Add comment to cleanup function
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Removes audit logs older than specified retention period and logs the cleanup action';

-- Create a view for easier audit log querying with user details
CREATE OR REPLACE VIEW public.audit_logs_with_user_details AS
SELECT 
    al.id,
    al.tenant_id,
    al.user_id,
    al.action,
    al.resource_type,
    al.resource_id,
    al.metadata,
    al.ip_address,
    al.user_agent,
    al.success,
    al.error_message,
    al.created_at,
    u.email as user_email,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'System') as user_name,
    t.name as tenant_name
FROM public.audit_logs al
LEFT JOIN public.users u ON u.id = al.user_id
LEFT JOIN public.tenants t ON t.id = al.tenant_id;

-- Add comment to view
COMMENT ON VIEW public.audit_logs_with_user_details IS 'Audit logs enriched with user and tenant information for easier reporting';

-- Grant appropriate permissions
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_logs_with_user_details TO authenticated;
GRANT USAGE ON SEQUENCE public.audit_logs_id_seq TO authenticated;

-- For service role (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT ALL ON public.audit_logs TO service_role;
        GRANT ALL ON public.audit_logs_with_user_details TO service_role;
        GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO service_role;
    END IF;
END $$;

-- Create initial system audit log entry
INSERT INTO public.audit_logs (
    tenant_id,
    action,
    resource_type,
    metadata,
    success,
    created_at
) VALUES (
    NULL, -- System operations use NULL tenant_id
    'system_migration',
    'database',
    jsonb_build_object(
        'migration', 'audit_logs_table',
        'version', '1.0.0',
        'description', 'Created audit_logs table and related functions'
    ),
    TRUE,
    NOW()
) ON CONFLICT DO NOTHING;
-- ==============================
-- END audit_logs_migration.sql
-- ==============================
