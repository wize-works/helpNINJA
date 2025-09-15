# Invitation System Consolidation

**Date:** December 2024  
**Status:** ✅ Complete  
**Migration:** `070_consolidate_invitations.sql`

## Problem Statement

The invitation system had several maintainability and design issues:

1. **Two Tables Doing the Same Thing:**
   - `team_invitations` - tracked sent invitations
   - `pending_tenant_memberships` - tracked accepted invitations pending signup

2. **Inconsistent Naming Convention:**
   - Database schema used `tenants`, `tenant_members`, `tenant_sites`
   - But invitations used `team_invitations` and `pending_tenant_memberships`

3. **Complex Two-Step Flow:**
   - Invitation creation → `team_invitations` 
   - Invitation acceptance → `pending_tenant_memberships`
   - User signup → Clerk webhook activates membership

4. **Poor Supportability:**
   - Difficult to track invitation lifecycle
   - Multiple places to check invitation status
   - Confusing data model

## Solution

### Single Consolidated Table: `public.tenant_member_invitations`

**Schema:**
```sql
CREATE TABLE public.tenant_member_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'analyst', 'support', 'viewer')),
    invited_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Contact info (captured during acceptance)
    first_name text,
    last_name text,
    
    -- Invitation lifecycle
    token text UNIQUE NOT NULL,
    expires_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'expired', 'cancelled')),
    
    -- Timestamps for lifecycle tracking
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz,
    completed_at timestamptz,
    
    -- Optional message from inviter
    message text,
    
    UNIQUE(tenant_id, email)
);
```

### Invitation Lifecycle States

1. **`pending`** - Invitation sent, user hasn't clicked link yet
2. **`accepted`** - User clicked invitation link, but hasn't signed up yet
3. **`completed`** - User signed up and is now an active tenant member
4. **`expired`** - Invitation expired (past `expires_at`)
5. **`cancelled`** - Invitation manually cancelled

### Updated Flow

1. **Dashboard sends invitation** → Creates record with `status = 'pending'`
2. **User clicks invitation link** → Updates to `status = 'accepted'`, sets `accepted_at`
3. **User signs up with Clerk** → Webhook updates to `status = 'completed'`, sets `completed_at`, creates `tenant_members` record

## Files Updated

### Database
- ✅ `src/sql/070_consolidate_invitations.sql` - Migration script
- ✅ Migrated existing data from both old tables
- ✅ Added proper indexes and RLS policies

### API Endpoints
- ✅ `src/app/api/team/invitations/route.ts` - Updated to use new table
- ✅ `src/app/api/invitations/[token]/route.ts` - Updated acceptance flow
- ✅ `src/app/api/clerk/webhook/route.ts` - Updated to complete invitations

### UI Components
- ✅ `src/components/add-team-member-form.tsx` - Already compatible
- ✅ `src/app/dashboard/team/page.tsx` - Already compatible

## Benefits

1. **Single Source of Truth:** All invitation data in one properly named table
2. **Clear Lifecycle:** Status field makes invitation state obvious
3. **Consistent Naming:** Follows `tenant_*` convention
4. **Better Supportability:** Easy to query and understand invitation flow
5. **Simplified Logic:** No more complex two-table joins and state management

## Testing

✅ Server starts without errors  
✅ Migration applied successfully  
✅ Old tables cleaned up  
✅ All API endpoints updated  

## Future Improvements

- [ ] Add invitation expiry cleanup job
- [ ] Add invitation analytics/metrics
- [ ] Consider bulk invitation features
- [ ] Add invitation templates

## Notes

The migration safely preserves all existing invitation data by:
1. Migrating `team_invitations` → `tenant_member_invitations` with appropriate status mapping
2. Merging `pending_tenant_memberships` data for users who had accepted but not completed signup
3. Preserving all timestamps and metadata

Old tables were manually dropped after successful migration verification.