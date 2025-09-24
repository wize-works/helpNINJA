-- Migration 091: Verify and Fix Sidebar Badge Tables
-- Run this to check what tables exist and create any missing ones
-- Date: 2024-12-XX

-- ======================================================================
-- VERIFICATION: Check which tables currently exist
-- ======================================================================

-- Display current table status
SELECT 
    'Table Status Check' as check_type,
    tablename,
    CASE 
        WHEN tablename IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES 
        ('crawl_attempts'::name),
        ('page_failures'::name), 
        ('feedback'::name),
        ('integrations'::name),
        ('integration_outbox'::name)
) AS required_tables(table_name)
LEFT JOIN pg_tables ON pg_tables.tablename = required_tables.table_name 
    AND pg_tables.schemaname = 'public'
ORDER BY required_tables.table_name;

-- ======================================================================
-- Check specific columns that the badge API needs
-- ======================================================================

-- Check if integrations table has the status column with correct values
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations' AND table_schema = 'public') THEN
        RAISE NOTICE 'Integrations table exists - checking status column...';
        
        -- Check if status column exists and show possible values
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integrations' AND column_name = 'status') THEN
            RAISE NOTICE '✅ integrations.status column exists';
        ELSE
            RAISE NOTICE '❌ integrations.status column is missing';
        END IF;
    ELSE
        RAISE NOTICE '❌ integrations table does not exist';
    END IF;
END $$;

-- Check integration_outbox table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integration_outbox' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ integration_outbox table exists';
        
        -- Check required columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integration_outbox' AND column_name = 'status') THEN
            RAISE NOTICE '✅ integration_outbox.status column exists';
        ELSE
            RAISE NOTICE '❌ integration_outbox.status column is missing';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integration_outbox' AND column_name = 'conversation_id') THEN
            RAISE NOTICE '✅ integration_outbox.conversation_id column exists';
        ELSE
            RAISE NOTICE '❌ integration_outbox.conversation_id column is missing';
        END IF;
    ELSE
        RAISE NOTICE '❌ integration_outbox table does not exist';
    END IF;
END $$;

-- Check feedback table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ feedback table exists';
        
        -- Check required columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'priority') THEN
            RAISE NOTICE '✅ feedback.priority column exists';
        ELSE
            RAISE NOTICE '❌ feedback.priority column is missing';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'type') THEN
            RAISE NOTICE '✅ feedback.type column exists';
        ELSE
            RAISE NOTICE '❌ feedback.type column is missing';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'resolved_at') THEN
            RAISE NOTICE '✅ feedback.resolved_at column exists';
        ELSE
            RAISE NOTICE '❌ feedback.resolved_at column is missing';
        END IF;
    ELSE
        RAISE NOTICE '❌ feedback table does not exist';
    END IF;
END $$;

-- Check crawl_attempts table (from migration 090)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crawl_attempts' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ crawl_attempts table exists';
        
        -- Check required columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crawl_attempts' AND column_name = 'status') THEN
            RAISE NOTICE '✅ crawl_attempts.status column exists';
        ELSE
            RAISE NOTICE '❌ crawl_attempts.status column is missing';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crawl_attempts' AND column_name = 'can_retry') THEN
            RAISE NOTICE '✅ crawl_attempts.can_retry column exists';
        ELSE
            RAISE NOTICE '❌ crawl_attempts.can_retry column is missing';
        END IF;
    ELSE
        RAISE NOTICE '❌ crawl_attempts table does not exist';
    END IF;
END $$;

-- Check page_failures table (from migration 090)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'page_failures' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ page_failures table exists';
        
        -- Check required columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'page_failures' AND column_name = 'is_resolved') THEN
            RAISE NOTICE '✅ page_failures.is_resolved column exists';
        ELSE
            RAISE NOTICE '❌ page_failures.is_resolved column is missing';
        END IF;
    ELSE
        RAISE NOTICE '❌ page_failures table does not exist';
    END IF;
END $$;

-- ======================================================================
-- SAMPLE DATA INSERTION (for testing badges)
-- ======================================================================

-- Uncomment the sections below to insert test data for badge testing
-- This will help you verify that the badge counts work correctly

/*
-- Insert sample failed crawl attempt (if crawl_attempts exists)
INSERT INTO public.crawl_attempts (tenant_id, source_url, status, can_retry, error_type, error_message)
SELECT 
    t.id,
    'https://example.com/test-page',
    'failed',
    true,
    'network',
    'Connection timeout during test'
FROM public.tenants t LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert sample page failure (if page_failures exists)
INSERT INTO public.page_failures (crawl_attempt_id, tenant_id, page_url, error_type, error_message, is_resolved)
SELECT 
    ca.id,
    ca.tenant_id,
    'https://example.com/failed-page',
    'server',
    'HTTP 500 Internal Server Error',
    false
FROM public.crawl_attempts ca LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert sample urgent feedback (if feedback exists)
INSERT INTO public.feedback (tenant_id, type, priority, title, description, status)
SELECT 
    t.id,
    'bug',
    'urgent',
    'Test urgent feedback',
    'This is a test urgent feedback item for badge testing',
    'open'
FROM public.tenants t LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert sample failed integration outbox item (if integration_outbox exists)
INSERT INTO public.integration_outbox (tenant_id, provider, payload, status, attempts, last_error)
SELECT 
    t.id,
    'email',
    '{"test": "failed delivery"}',
    'failed',
    3,
    'SMTP connection failed'
FROM public.tenants t LIMIT 1
ON CONFLICT DO NOTHING;
*/

-- ======================================================================
-- FINAL SUMMARY
-- ======================================================================

SELECT 
    'SUMMARY' as section,
    'Run this query to see which tables need to be created:' as instructions;

-- Show the actual counts that the badge API will query
SELECT 
    'Badge Count Preview' as section,
    'integrations (error/disabled)' as badge_type,
    COUNT(*) as count
FROM public.integrations 
WHERE status IN ('error', 'disabled')
UNION ALL
SELECT 
    'Badge Count Preview',
    'integration_outbox (failed)',
    COUNT(*)
FROM public.integration_outbox 
WHERE status = 'failed'
UNION ALL
SELECT 
    'Badge Count Preview',
    'crawl_attempts (failed, retryable)',
    COUNT(*)
FROM public.crawl_attempts 
WHERE status = 'failed' AND can_retry = true
UNION ALL
SELECT 
    'Badge Count Preview',
    'page_failures (unresolved)',
    COUNT(*)
FROM public.page_failures 
WHERE is_resolved = false
UNION ALL
SELECT 
    'Badge Count Preview',
    'feedback (urgent/high bugs)',
    COUNT(*)
FROM public.feedback 
WHERE (priority = 'urgent' OR (priority = 'high' AND type = 'bug'))
  AND resolved_at IS NULL;