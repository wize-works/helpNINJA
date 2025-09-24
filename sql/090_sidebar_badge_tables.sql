-- Migration: 090_sidebar_badge_tables.sql
-- Ensures all tables required for sidebar badges exist
-- This migration creates missing tables for the sidebar notification system

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================================================================
-- CRAWL TRACKING TABLES (from 080_ingestion_failure_tracking.sql)
-- ======================================================================

-- Table to track individual page crawling attempts and failures
CREATE TABLE IF NOT EXISTS public.crawl_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.tenant_sites(id) ON DELETE CASCADE,
    
    -- Source information
    source_url TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'url', -- 'url', 'sitemap', 'manual'
    parent_job_id UUID, -- Links to ingestion_jobs if part of larger job
    
    -- Attempt details
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'crawling', 'success', 'failed', 'skipped'
    
    -- Results
    pages_found INTEGER DEFAULT 0,
    pages_crawled INTEGER DEFAULT 0,
    pages_failed INTEGER DEFAULT 0,
    pages_skipped INTEGER DEFAULT 0,
    
    -- Error information (for failures)
    error_type TEXT, -- 'network', 'auth', 'conflict', 'timeout', 'server', 'parsing'
    error_code INTEGER, -- HTTP status code if applicable
    error_message TEXT,
    error_details JSONB, -- Additional error context
    
    -- Retry information
    can_retry BOOLEAN NOT NULL DEFAULT true,
    retry_after TIMESTAMP WITH TIME ZONE, -- When it's safe to retry
    max_retries INTEGER NOT NULL DEFAULT 3,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Performance metrics
    duration_ms INTEGER,
    bytes_processed BIGINT
);

-- Table to track individual page failures with detailed information
CREATE TABLE IF NOT EXISTS public.page_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawl_attempt_id UUID NOT NULL REFERENCES public.crawl_attempts(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Page information
    page_url TEXT NOT NULL,
    page_title TEXT,
    
    -- Failure details
    error_type TEXT NOT NULL, -- 'network', 'auth', 'conflict', 'timeout', 'server', 'parsing', 'content'
    error_code INTEGER, -- HTTP status code if applicable
    error_message TEXT NOT NULL,
    error_details JSONB, -- Additional error context (headers, stack trace, etc.)
    
    -- Context information
    attempt_number INTEGER NOT NULL DEFAULT 1,
    user_agent TEXT,
    referrer TEXT,
    
    -- Resolution information
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID, -- Reference to user who resolved it
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ======================================================================
-- INDEXES FOR CRAWL TRACKING TABLES
-- ======================================================================

-- Indexes for crawl_attempts
CREATE INDEX IF NOT EXISTS idx_crawl_attempts_tenant_status 
    ON public.crawl_attempts (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_crawl_attempts_site_status 
    ON public.crawl_attempts (site_id, status) WHERE site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crawl_attempts_retry 
    ON public.crawl_attempts (tenant_id, can_retry, retry_after) WHERE can_retry = true;

CREATE INDEX IF NOT EXISTS idx_crawl_attempts_recent_failures 
    ON public.crawl_attempts (tenant_id, created_at DESC) 
    WHERE status = 'failed' AND can_retry = true;

-- Indexes for page_failures
CREATE INDEX IF NOT EXISTS idx_page_failures_crawl_attempt 
    ON public.page_failures (crawl_attempt_id);

CREATE INDEX IF NOT EXISTS idx_page_failures_tenant_unresolved 
    ON public.page_failures (tenant_id, is_resolved) WHERE is_resolved = false;

CREATE INDEX IF NOT EXISTS idx_page_failures_error_type 
    ON public.page_failures (tenant_id, error_type);

CREATE INDEX IF NOT EXISTS idx_page_failures_created 
    ON public.page_failures (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_page_failures_recent 
    ON public.page_failures (tenant_id, created_at DESC, error_type);

-- ======================================================================
-- TRIGGERS FOR TIMESTAMP UPDATES
-- ======================================================================

-- Create or replace the timestamp update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for crawl_attempts
DROP TRIGGER IF EXISTS update_crawl_attempts_updated_at ON public.crawl_attempts;
CREATE TRIGGER update_crawl_attempts_updated_at 
    BEFORE UPDATE ON public.crawl_attempts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add triggers for page_failures
DROP TRIGGER IF EXISTS update_page_failures_updated_at ON public.page_failures;
CREATE TRIGGER update_page_failures_updated_at 
    BEFORE UPDATE ON public.page_failures 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ======================================================================
-- ROW LEVEL SECURITY
-- ======================================================================

-- Enable RLS for new tables
ALTER TABLE public.crawl_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_failures ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for tenant isolation if using Supabase auth
-- Note: These policies assume you have proper tenant context setup
-- If you're not using Supabase auth, comment these out and handle tenant isolation in your application

-- Policies for crawl_attempts (commented out - uncomment if using Supabase auth with tenant context)
-- CREATE POLICY crawl_attempts_tenant_isolation ON public.crawl_attempts
--     FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Policies for page_failures (commented out - uncomment if using Supabase auth with tenant context)
-- CREATE POLICY page_failures_tenant_isolation ON public.page_failures
--     FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ======================================================================
-- TABLE COMMENTS FOR DOCUMENTATION
-- ======================================================================

COMMENT ON TABLE public.crawl_attempts IS 'Tracks ingestion attempts with success/failure status and retry capabilities';
COMMENT ON TABLE public.page_failures IS 'Detailed failure information for individual pages that failed to crawl';

COMMENT ON COLUMN public.crawl_attempts.error_type IS 'Classification of error: network, auth, conflict, timeout, server, parsing';
COMMENT ON COLUMN public.crawl_attempts.can_retry IS 'Whether this attempt can be retried (some errors like auth may not be retryable)';
COMMENT ON COLUMN public.crawl_attempts.retry_after IS 'Earliest time when retry should be attempted (for rate limiting)';

COMMENT ON COLUMN public.page_failures.error_type IS 'Type of failure: network, auth, conflict, timeout, server, parsing, content';
COMMENT ON COLUMN public.page_failures.is_resolved IS 'Whether this failure has been acknowledged/resolved by a user';

-- ======================================================================
-- VERIFICATION QUERIES
-- ======================================================================

-- Verify tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    -- Check that all required tables exist
    SELECT count(*)
    INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('crawl_attempts', 'page_failures', 'feedback', 'integrations', 'integration_outbox');
    
    RAISE NOTICE 'Sidebar badge migration completed. Tables found: %', table_count;
    
    IF table_count >= 3 THEN
        RAISE NOTICE 'SUCCESS: All required badge tables are available';
    ELSE
        RAISE WARNING 'Some tables may be missing. Expected at least 3, found %', table_count;
    END IF;
END $$;

-- Display table status for confirmation
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('crawl_attempts', 'page_failures', 'feedback', 'integrations', 'integration_outbox')
ORDER BY tablename;