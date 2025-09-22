-- Test script to verify activity tracking works
-- Run this against your database to test the activity tracking functionality

-- First, let's check the current state of tenant_members
SELECT 
    tm.user_id,
    tm.tenant_id,
    tm.last_active_at,
    u.email,
    tm.role
FROM public.tenant_members tm
JOIN public.users u ON u.id = tm.user_id
ORDER BY tm.last_active_at DESC NULLS LAST
LIMIT 10;

-- Now let's test the update_user_activity function
-- You'll need to replace these UUIDs with actual values from your database
-- Get a user_id and tenant_id from the above query, then run:

-- Example (replace with real UUIDs):
-- SELECT update_user_activity('your-user-id-here', 'your-tenant-id-here');

-- Then check if last_active_at was updated:
-- SELECT 
--     user_id,
--     tenant_id, 
--     last_active_at,
--     last_active_at > NOW() - INTERVAL '1 minute' as recently_updated
-- FROM public.tenant_members 
-- WHERE user_id = 'your-user-id-here' AND tenant_id = 'your-tenant-id-here';

-- This should show recently_updated = true if the function worked