# Manual SQL Migration Guide - Sidebar Badge Tables

## Step 1: Check Current Database Status

First, run this verification query to see what tables exist:

```sql
-- Run this in your database to check table status
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
```

## Step 2: Apply Missing Tables

Based on your results from Step 1, apply the appropriate SQL:

### If `crawl_attempts` is missing:
```sql
-- Create crawl_attempts table
CREATE TABLE IF NOT EXISTS public.crawl_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.tenant_sites(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'url',
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    pages_found INTEGER DEFAULT 0,
    pages_crawled INTEGER DEFAULT 0,
    pages_failed INTEGER DEFAULT 0,
    error_type TEXT,
    error_message TEXT,
    can_retry BOOLEAN NOT NULL DEFAULT true,
    retry_after TIMESTAMP WITH TIME ZONE,
    max_retries INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_crawl_attempts_tenant_status ON public.crawl_attempts (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_crawl_attempts_retry ON public.crawl_attempts (tenant_id, can_retry, retry_after) WHERE can_retry = true;
```

### If `page_failures` is missing:
```sql
-- Create page_failures table
CREATE TABLE IF NOT EXISTS public.page_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawl_attempt_id UUID NOT NULL REFERENCES public.crawl_attempts(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    page_url TEXT NOT NULL,
    page_title TEXT,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_page_failures_tenant_unresolved ON public.page_failures (tenant_id, is_resolved) WHERE is_resolved = false;
```

### If `feedback` table is missing (unlikely, should be in main schema):
```sql
-- This table should already exist from migration 068_feedback_system.sql
-- If missing, you need to apply the full feedback system migration
```

### If `integrations` or `integration_outbox` are missing:
```sql
-- These tables should already exist from migration 040_integrations.sql
-- If missing, you need to apply the integrations migration first
```

## Step 3: Verify Everything Works

Run this query to test what the badge API will see:

```sql
-- Test badge counts (replace 'your-tenant-id' with actual tenant ID)
SELECT 
    'integrations (error/disabled)' as badge_type,
    COUNT(*) as count
FROM public.integrations 
WHERE tenant_id = 'your-tenant-id' 
  AND status IN ('error', 'disabled')
UNION ALL
SELECT 
    'integration_outbox (failed)',
    COUNT(*)
FROM public.integration_outbox 
WHERE tenant_id = 'your-tenant-id' 
  AND status = 'failed'
UNION ALL
SELECT 
    'crawl_attempts (failed, retryable)',
    COUNT(*)
FROM public.crawl_attempts 
WHERE tenant_id = 'your-tenant-id' 
  AND status = 'failed' AND can_retry = true
UNION ALL
SELECT 
    'page_failures (unresolved)',
    COUNT(*)
FROM public.page_failures 
WHERE tenant_id = 'your-tenant-id' 
  AND is_resolved = false
UNION ALL
SELECT 
    'feedback (urgent/high bugs)',
    COUNT(*)
FROM public.feedback 
WHERE tenant_id = 'your-tenant-id' 
  AND (priority = 'urgent' OR (priority = 'high' AND type = 'bug'))
  AND resolved_at IS NULL;
```

## Step 4: Test the Badge API

After applying the SQL, test the API endpoint:

```bash
curl http://localhost:3001/api/sidebar/badges
```

You should get a response like:
```json
{
  "knowledge": {
    "sites": null,
    "sources": null,
    "documents": null,
    "answers": null,
    "crawlFailures": 0,
    "widget": null
  },
  "conversations": 0,
  "feedback": 0,
  "integrations": {
    "installed": 0,
    "marketplace": 0
  },
  "automation": {
    "rules": 0,
    "outbox": 0
  }
}
```

## Troubleshooting

**"relation does not exist" error**: The table hasn't been created yet. Run the appropriate CREATE TABLE statement from Step 2.

**"column does not exist" error**: The table exists but is missing required columns. You may need to run ALTER TABLE statements to add missing columns.

**Permission errors**: Make sure your database user has CREATE and SELECT permissions.

**Foreign key errors**: Make sure the referenced tables (tenants, tenant_sites) exist first.

## Optional: Add Test Data

To test that badges show up, you can add some test data:

```sql
-- Add a failed crawl attempt (will show in Knowledge → Crawl Failures)
INSERT INTO public.crawl_attempts (tenant_id, source_url, status, can_retry, error_type, error_message)
VALUES 
    ('your-tenant-id', 'https://example.com/test', 'failed', true, 'network', 'Test failure');

-- Add urgent feedback (will show in Feedback)
INSERT INTO public.feedback (tenant_id, type, priority, title, description, status)
VALUES 
    ('your-tenant-id', 'bug', 'urgent', 'Test urgent issue', 'This is a test', 'open');
```

Replace `'your-tenant-id'` with your actual tenant UUID.