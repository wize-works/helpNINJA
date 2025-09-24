-- Migration for ingestion failure tracking and retry system
-- This allows tracking failed ingestion attempts and providing manual retry capabilities

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

-- Create indexes for page_failures table
CREATE INDEX IF NOT EXISTS idx_page_failures_crawl_attempt 
    ON public.page_failures (crawl_attempt_id);

CREATE INDEX IF NOT EXISTS idx_page_failures_tenant_unresolved 
    ON public.page_failures (tenant_id, is_resolved) WHERE is_resolved = false;

CREATE INDEX IF NOT EXISTS idx_page_failures_error_type 
    ON public.page_failures (tenant_id, error_type);

CREATE INDEX IF NOT EXISTS idx_page_failures_created 
    ON public.page_failures (tenant_id, created_at DESC);

-- Create indexes for crawl_attempts table
CREATE UNIQUE INDEX IF NOT EXISTS idx_crawl_attempts_tenant_source_created 
    ON public.crawl_attempts (tenant_id, source_url, created_at);

CREATE INDEX IF NOT EXISTS idx_crawl_attempts_tenant_status 
    ON public.crawl_attempts (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_crawl_attempts_site_status 
    ON public.crawl_attempts (site_id, status) WHERE site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crawl_attempts_retry 
    ON public.crawl_attempts (tenant_id, can_retry, retry_after) WHERE can_retry = true;

CREATE INDEX IF NOT EXISTS idx_crawl_attempts_parent_job 
    ON public.crawl_attempts (parent_job_id) WHERE parent_job_id IS NOT NULL;

-- Add trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crawl_attempts_updated_at 
    BEFORE UPDATE ON public.crawl_attempts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_failures_updated_at 
    BEFORE UPDATE ON public.page_failures 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies if needed (following existing tenant isolation pattern)
ALTER TABLE public.crawl_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_failures ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies would be added here if using Supabase auth
-- For now, tenant isolation is handled at the application level via getTenantIdStrict()

-- Add useful indexes for common queries
CREATE INDEX IF NOT EXISTS idx_crawl_attempts_recent_failures 
    ON public.crawl_attempts (tenant_id, created_at DESC) 
    WHERE status = 'failed' AND can_retry = true;

CREATE INDEX IF NOT EXISTS idx_page_failures_recent 
    ON public.page_failures (tenant_id, created_at DESC, error_type);

-- Add comments for documentation
COMMENT ON TABLE public.crawl_attempts IS 'Tracks ingestion attempts with success/failure status and retry capabilities';
COMMENT ON TABLE public.page_failures IS 'Detailed failure information for individual pages that failed to crawl';

COMMENT ON COLUMN public.crawl_attempts.error_type IS 'Classification of error: network, auth, conflict, timeout, server, parsing';
COMMENT ON COLUMN public.crawl_attempts.can_retry IS 'Whether this attempt can be retried (some errors like auth may not be retryable)';
COMMENT ON COLUMN public.crawl_attempts.retry_after IS 'Earliest time when retry should be attempted (for rate limiting)';

COMMENT ON COLUMN public.page_failures.error_type IS 'Type of failure: network, auth, conflict, timeout, server, parsing, content';
COMMENT ON COLUMN public.page_failures.is_resolved IS 'Whether this failure has been acknowledged/resolved by a user';