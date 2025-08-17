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
