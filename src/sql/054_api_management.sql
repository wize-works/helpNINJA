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
