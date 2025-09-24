# Sidebar Badge Tables Migration Guide

This guide explains how to ensure all required tables exist for the sidebar notification system.

## Overview

The sidebar badge system requires several database tables to track different types of notifications:

- **`crawl_attempts`** - Track ingestion attempts and failures
- **`page_failures`** - Detailed failure information for individual pages
- **`feedback`** - User feedback and bug reports
- **`integrations`** - Integration configurations and status
- **`integration_outbox`** - Failed integration deliveries

## Required Tables Status

| Table | Purpose | Badge Area |
|-------|---------|------------|
| `crawl_attempts` | Track crawling attempts and failures | Knowledge → Crawl Failures |
| `page_failures` | Individual page failure details | Knowledge → Crawl Failures |
| `feedback` | User feedback and bug reports | Feedback |
| `integrations` | Integration configurations | Integrations → Installed |
| `integration_outbox` | Failed delivery tracking | Automation → Outbox |

## Migration Options

### Option 1: Apply Migration SQL (Recommended)

Run the migration script we've created:

```bash
# If using Supabase locally
supabase db reset

# Or apply the migration directly to your database
psql "your-database-url" -f sql/090_sidebar_badge_tables.sql
```

### Option 2: Using Supabase Dashboard

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `sql/090_sidebar_badge_tables.sql`
4. Click **Run** to execute the migration

### Option 3: Manual Table Creation

If you prefer to create tables individually, here are the essential ones:

#### Core Tables (These should already exist in your schema)
- `integrations` - Already in main schema
- `integration_outbox` - Already in main schema  
- `feedback` - Already in main schema (from migration 068)

#### Missing Tables (Need to be created)
- `crawl_attempts` - Defined in `sql/080_ingestion_failure_tracking.sql`
- `page_failures` - Defined in `sql/080_ingestion_failure_tracking.sql`

## Verification

After applying the migration, verify all tables exist:

```sql
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
```

Expected result: 5 tables should be listed.

## Troubleshooting

### If Migration Fails

1. **Check database permissions**: Ensure your database user has CREATE privileges
2. **Check dependencies**: Ensure base tables (`tenants`, `tenant_sites`) exist
3. **Check extensions**: Ensure `uuid-ossp` extension is available

### If Badge API Still Returns Errors

1. **Verify table existence**: Run the verification query above
2. **Check table permissions**: Ensure your app's database role can SELECT from these tables
3. **Review logs**: Check the application logs for specific error messages

### Common Issues

**"relation does not exist" errors**: The tables haven't been created yet. Apply the migration.

**Permission denied**: Your database user needs SELECT permissions on the tables.

**Foreign key constraint errors**: Base tables (`tenants`, `tenant_sites`) need to exist first.

## What Changes After Migration

Once the tables exist, the sidebar will show real notification counts instead of zeros:

- **Knowledge → Sources**: Shows failed crawl attempts that can be retried
- **Conversations**: Shows conversations with failed escalations  
- **Feedback**: Shows urgent/high-priority unresolved feedback
- **Integrations → Installed**: Shows failed or disabled integrations
- **Automation → Outbox**: Shows failed delivery attempts

## Next Steps

After applying the migration:

1. **Test the badge API**: Visit `/api/sidebar/badges` to see if it returns data without errors
2. **Check the sidebar**: The notification badges should now show real counts
3. **Monitor logs**: Watch for any remaining database errors
4. **Set up monitoring**: Consider adding alerts for failed integrations/crawls

## Notes

- Tables created with `IF NOT EXISTS` so safe to re-run
- Includes proper indexes for performance
- RLS policies are commented out (uncomment if using Supabase auth with tenant context)
- Includes triggers for automatic `updated_at` timestamp management

For questions or issues, refer to the application logs or database error messages for specific details.