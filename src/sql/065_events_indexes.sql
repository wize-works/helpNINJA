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
