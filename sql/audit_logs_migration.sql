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