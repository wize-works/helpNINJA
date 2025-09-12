# helpNINJA Access Control Implementation Plan

This document outlines specific action items to implement missing subscription and role-based gates identified in the audit.

## Phase 1: Critical Security & Role-Based Access (Week 1-2)

### 1.1 Implement Role-Based API Protection

**Files to Create/Modify:**
- `src/lib/rbac.ts` - New role-based access control utilities
- `src/lib/auth-middleware.ts` - Enhanced with role checking
- All dashboard API routes - Add role verification

**Implementation Steps:**

1. **Create RBAC Utilities** (`src/lib/rbac.ts`):
```typescript
export type UserRole = 'owner' | 'admin' | 'member';

export async function getUserRole(userId: string, tenantId: string): Promise<UserRole | null> {
  const result = await query(
    'SELECT role FROM public.tenant_members WHERE user_id = $1 AND tenant_id = $2 AND status = $3',
    [userId, tenantId, 'active']
  );
  return result.rows[0]?.role || null;
}

export function requireRole(allowedRoles: UserRole[]) {
  return async (req: AuthenticatedRequest) => {
    if (!req.userId) throw new Error('User authentication required');
    const userRole = await getUserRole(req.userId, req.tenantId);
    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new Error('Insufficient role permissions');
    }
  };
}
```

2. **Enhance Auth Middleware** (`src/lib/auth-middleware.ts`):
```typescript
// Add role-based wrapper
export function withRoleAuth(
  handler: (req: AuthenticatedRequest, ...args: unknown[]) => Promise<NextResponse>,
  options: {
    requiredRoles?: UserRole[];
    requiredPermissions?: string[];
    allowSessionAuth?: boolean;
  } = {}
) {
  return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    // ... existing auth logic ...
    
    // Add role checking
    if (options.requiredRoles && authResult.userId) {
      const userRole = await getUserRole(authResult.userId, authResult.tenantId);
      if (!userRole || !options.requiredRoles.includes(userRole)) {
        return NextResponse.json(
          { error: 'Insufficient role permissions' },
          { status: 403 }
        );
      }
    }
    
    // ... rest of implementation ...
  };
}
```

3. **Update Dashboard API Routes** - Examples:
   - `/api/team` - Require `admin` or `owner` roles
   - `/api/api-keys` - Require `admin` or `owner` roles  
   - `/api/billing` - Require `owner` role
   - `/api/usage` - Allow all roles (read-only)

### 1.2 Implement Plan-Based Feature Gates

**Files to Create/Modify:**
- `src/lib/plan-features.ts` - New plan feature definitions
- API routes requiring feature checks

**Implementation Steps:**

1. **Create Plan Feature Definitions** (`src/lib/plan-features.ts`):
```typescript
export type PlanFeature = 
  | 'basic_analytics' 
  | 'advanced_analytics'
  | 'api_access'
  | 'slack_integration'
  | 'custom_integrations'
  | 'priority_support'
  | 'advanced_rules'
  | 'conversation_management'
  | 'webhook_management';

export const PLAN_FEATURES: Record<Plan, PlanFeature[]> = {
  none: ['basic_analytics'],
  starter: ['basic_analytics', 'api_access'],
  pro: ['basic_analytics', 'advanced_analytics', 'api_access', 'slack_integration', 'conversation_management'],
  agency: ['basic_analytics', 'advanced_analytics', 'api_access', 'slack_integration', 'custom_integrations', 'priority_support', 'advanced_rules', 'conversation_management', 'webhook_management']
};

export async function hasFeature(tenantId: string, feature: PlanFeature): Promise<boolean> {
  const result = await query('SELECT plan FROM public.tenants WHERE id = $1', [tenantId]);
  const plan = result.rows[0]?.plan as Plan || 'none';
  return PLAN_FEATURES[plan].includes(feature);
}

export function requireFeature(feature: PlanFeature) {
  return async (req: AuthenticatedRequest) => {
    if (!await hasFeature(req.tenantId, feature)) {
      throw new Error(`Feature '${feature}' not available on current plan`);
    }
  };
}
```

2. **Apply Feature Gates to APIs**:
   - `/api/webhooks` - Require `webhook_management` feature
   - `/api/escalation-rules` - Require `advanced_rules` for complex rules
   - `/api/analytics/advanced` - Require `advanced_analytics` feature

### 1.3 Enhanced Audit Logging

**Files to Create:**
- `src/lib/audit-log.ts` - Comprehensive audit logging

**Implementation:**
```typescript
export type AuditAction = 
  | 'api_key_created' | 'api_key_deleted' | 'api_key_rotated'
  | 'team_member_invited' | 'team_member_removed'
  | 'plan_changed' | 'billing_updated'
  | 'unauthorized_access_attempt';

export async function logAuditEvent(params: {
  tenantId: string;
  userId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  await query(`
    INSERT INTO public.audit_logs (
      tenant_id, user_id, action, resource_type, resource_id, 
      metadata, ip_address, user_agent, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
  `, [
    params.tenantId, params.userId, params.action, params.resourceType,
    params.resourceId, JSON.stringify(params.metadata || {}),
    params.ipAddress, params.userAgent
  ]);
}
```

## Phase 2: Enhanced Rate Limiting & Quotas (Week 3)

### 2.1 Plan-Based Rate Limiting

**Files to Modify:**
- `src/lib/limits.ts` - Add rate limit definitions
- `src/lib/auth-middleware.ts` - Enhanced rate limiting

**Implementation:**
```typescript
// Add to limits.ts
export const PLAN_RATE_LIMITS: Record<Plan, { api_requests_per_hour: number; burst_limit: number }> = {
  none: { api_requests_per_hour: 100, burst_limit: 10 },
  starter: { api_requests_per_hour: 1000, burst_limit: 50 },
  pro: { api_requests_per_hour: 5000, burst_limit: 100 },
  agency: { api_requests_per_hour: 20000, burst_limit: 500 }
};
```

### 2.2 Resource Quotas

**Files to Create:**
- `src/lib/resource-quotas.ts` - Document and conversation limits

**Implementation:**
```typescript
export const PLAN_QUOTAS: Record<Plan, {
  max_documents: number;
  conversation_retention_days: number;
  api_keys_limit: number;
  team_members_limit: number;
}> = {
  none: { max_documents: 0, conversation_retention_days: 30, api_keys_limit: 1, team_members_limit: 1 },
  starter: { max_documents: 1000, conversation_retention_days: 90, api_keys_limit: 3, team_members_limit: 3 },
  pro: { max_documents: 10000, conversation_retention_days: 365, api_keys_limit: 10, team_members_limit: 10 },
  agency: { max_documents: 100000, conversation_retention_days: -1, api_keys_limit: 50, team_members_limit: 50 }
};
```

## Phase 3: Advanced Features & UI Integration (Week 4)

### 3.1 Dashboard Feature Gating

**Files to Modify:**
- Dashboard components - Add plan/role checks
- Navigation components - Conditional menu items

### 3.2 Webhook Security

**Files to Create:**
- `src/lib/webhook-security.ts` - Request signing and validation

### 3.3 Advanced Analytics Protection

**Files to Modify:**
- Analytics API routes - Plan-based data access

## Database Schema Changes Required

### New Tables Needed:

1. **Audit Logs Table**:
```sql
CREATE TABLE public.audit_logs (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
```

2. **Feature Flags Table** (Future):
```sql
CREATE TABLE public.tenant_feature_flags (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, feature_key)
);
```

## Testing Strategy

### Unit Tests Required:
- `src/lib/rbac.ts` - Role checking functions
- `src/lib/plan-features.ts` - Feature availability checks
- `src/lib/auth-middleware.ts` - Enhanced authentication

### Integration Tests Required:
- API route protection with different roles
- Plan limit enforcement
- Rate limiting behavior

### Manual Testing Checklist:
- [ ] Admin can manage team members
- [ ] Members cannot access admin features
- [ ] Plan limits are enforced correctly
- [ ] Feature gates work as expected
- [ ] Audit logs capture all actions

## Rollout Plan

### Week 1:
- [ ] Implement RBAC utilities
- [ ] Add role checks to critical APIs
- [ ] Create audit logging system

### Week 2:
- [ ] Implement plan feature gates
- [ ] Apply feature restrictions to APIs
- [ ] Add comprehensive logging

### Week 3:
- [ ] Enhanced rate limiting
- [ ] Resource quota implementation
- [ ] Database schema updates

### Week 4:
- [ ] Dashboard UI integration
- [ ] Advanced security features
- [ ] Testing and validation

## Success Metrics

1. **Security**: Zero unauthorized access incidents
2. **Compliance**: 100% audit trail coverage for admin actions
3. **Performance**: Rate limiting prevents abuse without impacting legitimate usage
4. **User Experience**: Clear error messages when limits are reached
5. **Revenue Protection**: Plan limits encourage upgrades without blocking users unnecessarily

## Risk Mitigation

1. **Backward Compatibility**: Implement feature flags for gradual rollout
2. **Performance Impact**: Cache role/plan lookups to minimize database queries
3. **User Disruption**: Provide clear upgrade paths when limits are reached
4. **Data Security**: Comprehensive testing of tenant isolation
5. **Monitoring**: Enhanced logging and alerting for access control failures

---

**Estimated Total Effort**: 3-4 weeks  
**Priority Level**: Critical  
**Dependencies**: Database migration, Clerk integration testing