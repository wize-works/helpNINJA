# User Activity Tracking Implementation

## Overview

This document describes the implementation of user activity tracking in helpNINJA, specifically updating the `last_active_at` field in the `tenant_members` table.

## Database Schema

The `public.tenant_members` table includes:
```sql
last_active_at timestamptz -- Updated when user performs meaningful activities
```

A stored procedure exists to update this field:
```sql
CREATE OR REPLACE FUNCTION update_user_activity(p_user_id uuid, p_tenant_id uuid) 
RETURNS void AS $$
BEGIN
    UPDATE public.tenant_members 
    SET last_active_at = NOW() 
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;
```

## Implementation

### Activity Tracking Library

**File:** `src/lib/activity-tracker.ts`

Provides three main functions:

1. **`updateUserActivity(userId?, tenantId?)`** - Core function to update activity
2. **`withActivityTracking(handler)`** - Middleware wrapper for API routes
3. **`trackActivity()`** - Simple helper for existing routes

### What Counts as User Activity

Users are considered "active" when they:

- **View dashboard data**: `/api/usage`, `/api/analytics`, `/api/tenant/info`
- **Manage team members**: `/api/team` (GET/POST)
- **Search documents**: `/api/documents/search`
- **Access any authenticated dashboard endpoint**

### API Routes Updated

The following routes now track user activity:

- ✅ `/api/team` (GET, POST) - Team management
- ✅ `/api/usage` (GET) - Usage statistics viewing
- ✅ `/api/analytics` (GET) - Analytics viewing  
- ✅ `/api/tenant/info` (GET) - Tenant information viewing
- ✅ `/api/documents/search` (GET) - Document searching

### How It Works

1. **Authentication Context**: Uses Clerk authentication to resolve internal user UUID
2. **Tenant Resolution**: Uses `getTenantIdStrict()` to get current tenant context
3. **Database Update**: Calls stored procedure to update `last_active_at` timestamp
4. **Error Handling**: Activity tracking never breaks the main request flow

## Usage Examples

### Adding to New Routes

```typescript
import { trackActivity } from '@/lib/activity-tracker';

export async function GET() {
    // Track activity at the start of authenticated routes
    await trackActivity();
    
    // Your existing route logic...
}
```

### Using the Middleware Wrapper

```typescript
import { withActivityTracking } from '@/lib/activity-tracker';

const myHandler = async (req: NextRequest) => {
    // Your route logic
};

// Export wrapped handler
export const GET = withActivityTracking(myHandler);
```

## Frontend Integration

The team member cards in the dashboard already display last activity:

**File:** `src/components/team-member-card.tsx`

```typescript
const getLastActiveText = () => {
    if (!member.last_active_at) {
        return member.status === 'pending' ? 'Invitation pending' : 'Never logged in';
    }
    
    const lastActive = new Date(member.last_active_at);
    const now = new Date();
    const diffInHours = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
        return 'Active now';
    } else if (diffInHours < 24) {
        return `Active ${Math.floor(diffInHours)}h ago`;
    } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `Active ${diffInDays}d ago`;
    }
};
```

## Testing

Use the test script `test-activity-tracking.sql` to verify the implementation:

1. Check current state of `tenant_members` table
2. Manually call `update_user_activity()` function
3. Verify `last_active_at` was updated

## Notes

- **Chat API**: The `/api/chat` endpoint is public and doesn't use Clerk authentication, so it doesn't track activity for specific users
- **Error Handling**: Activity tracking failures are logged but don't interrupt the main request flow
- **Performance**: The database function is lightweight and won't impact response times
- **Existing Data**: Users who haven't been active since implementation will show "Never logged in" until they perform a tracked activity

## Future Enhancements

Consider adding activity tracking to:
- API key usage (when used by authenticated users)
- Document uploads/management
- Integration configurations
- Billing/subscription changes
- Settings updates