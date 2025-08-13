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
