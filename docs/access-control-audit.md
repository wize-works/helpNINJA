# helpNINJA Access Control & Gating Audit

This document provides a comprehensive overview of all subscription-based and role-based access controls currently implemented in the helpNINJA platform, as well as gaps that need to be addressed.

## Current Access Control Mechanisms

### 1. Subscription-Based Gates (Plan Limits)

#### Implementation Location
- **Core Files**: `src/lib/usage.ts`, `src/lib/limits.ts`
- **Plan Definitions**: `src/lib/limits.ts` - `PLAN_LIMITS` constant

#### Current Plan Structure
```typescript
const PLAN_LIMITS = {
    none: { sites: 0, messages: 10 },      // Trial limits
    starter: { sites: 1, messages: 1000 }, // Basic tier
    pro: { sites: 3, messages: 5000 },     // Professional tier
    agency: { sites: 10, messages: 20000 } // Enterprise tier
};
```

#### Gated Features by Plan

**Message Limits**
- **Location**: Chat API (`src/app/api/chat/route.ts`)
- **Gate Function**: `canSendMessage(tenantId)` 
- **Implementation**: Checks monthly message count against plan limit before OpenAI calls
- **Enforcement**: Returns 402 status if limit exceeded
- **Reset**: Monthly on 1st day of UTC month

**Site Ingestion Limits**
- **Location**: Ingest API (`src/app/api/ingest/route.ts`)
- **Gate Function**: `canAddSite(tenantId, hostToAdd)`
- **Implementation**: Counts unique domains per tenant and compares to plan limit
- **Enforcement**: Returns 402 status with plan details if limit exceeded

#### Usage Tracking
- **Table**: `public.usage_counters`
- **Tracking**: Message counts per tenant per month
- **Functions**: 
  - `ensureUsageRow(tenantId)` - Creates usage tracking row
  - `resetIfNewMonth(tenantId)` - Resets counters monthly
  - `incMessages(tenantId)` - Increments message count after successful API calls

#### Bypass Mechanism
- **Environment Variable**: `DISABLE_USAGE_LIMITS=true|1`
- **Effect**: Bypasses all subscription-based limits (for development/testing)

### 2. Authentication & Authorization

#### API Key-Based Authentication

**Implementation**: `src/lib/auth-middleware.ts`

**Key Types**:
- `public` - For client-side widget usage
- `secret` - For server-side API access  
- `webhook` - For webhook endpoints

**Permissions System**:
- `chat` - Send messages, create conversations
- `documents.read` - Read documents and chunks
- `documents.write` - Ingest and manage documents
- `analytics.read` - Access usage and analytics data
- `webhooks.send` - Send webhook notifications
- `admin` - Full access (bypasses other permission checks)

**Rate Limiting**:
- Per API key hourly limits (default: 1000/hour)
- Tracked in `public.api_usage_logs` table
- Returns 429 status when exceeded

**Key Management**:
- Generated with secure random values
- Prefixed by type: `hn_pk_`, `hn_sk_`, `hn_wh_`
- Expiration support (optional)
- Usage tracking (last_used_at, usage_count)

#### Session-Based Authentication (Dashboard)

**Implementation**: `src/lib/tenant-resolve.ts`

**Clerk Integration**:
- Uses Clerk for user authentication
- Maps Clerk organizations to tenant IDs
- `getTenantIdStrict()` requires authenticated user + active organization

**Tenant Resolution Order**:
1. Search params (`tenantId`, `tenant`)
2. Headers (`x-tenant-id`, `x-tenant`, `x-hn-tenant`)
3. Cookies (`hn_tenant`, `tenantId`)
4. Environment fallback (if allowed)
5. Clerk organization mapping

### 3. Role-Based Access Control (RBAC)

#### Current Implementation Status: **PARTIAL**

**Team Members Table**: `public.tenant_members`
- Roles: `owner`, `admin`, `member`
- Status tracking: `pending`, `active`, `inactive`
- Invitation system with email-based invites

**API Key Permissions**:
- Fine-grained permissions per API key
- Permission validation in `auth-middleware.ts`
- Admin permissions bypass individual checks

### 4. API Route Protection Patterns

#### Dashboard/Admin APIs
- **Pattern**: Use `getTenantIdStrict()` 
- **Requirements**: Clerk authentication + active organization
- **Examples**:
  - `/api/usage` - Usage statistics
  - `/api/api-keys` - API key management
  - `/api/billing/checkout` - Subscription management
  - `/api/team` - Team member management

#### Public/Widget APIs  
- **Pattern**: Use tenant resolution from request body/headers
- **Requirements**: Valid tenant identifier (public_key, secret_key, or slug)
- **Examples**:
  - `/api/chat` - Chat interactions
  - `/api/widget` - Widget script serving

#### API Key Protected Routes
- **Pattern**: Use `requireApiKey([permissions])` middleware
- **Requirements**: Valid API key with specific permissions
- **Examples**:
  - `/api/conversations` - Requires `chat` permission
  - API routes for programmatic access

### 5. Billing Integration

#### Stripe Integration
- **Webhook**: `/api/stripe/webhook` updates tenant plan/status
- **Checkout**: `/api/billing/checkout` creates payment sessions
- **Portal**: `/api/billing/portal` for subscription management

#### Plan Status Enforcement
- Plans stored in `public.tenants.plan` and `plan_status`
- Usage gates check plan status before allowing operations
- Automatic usage counter initialization via Stripe webhooks

## Current Gaps & Missing Gates

### 1. **Role-Based Feature Access** ⚠️ HIGH PRIORITY
**Status**: Partially implemented, needs completion

**Missing**:
- Role-based restrictions on dashboard features
- Permission checks in dashboard UI components
- API route protection based on user roles
- Fine-grained permissions per role

**Current State**: 
- Team member roles exist in database
- No enforcement in API routes or UI

### 2. **Plan-Based Feature Gates** ⚠️ MEDIUM PRIORITY
**Status**: Basic limits implemented, advanced features ungated

**Missing Plan Restrictions**:
- Advanced analytics (usage by source, performance metrics)
- Premium integrations (Slack, custom webhooks)
- Advanced escalation rules
- Conversation management features
- API access (starter plans should have limited API access)
- Conversation history retention limits
- Widget customization options
- Priority support features

### 3. **API Rate Limiting** ⚠️ MEDIUM PRIORITY  
**Status**: Basic implementation, needs enhancement

**Current**: Hourly limits per API key
**Missing**:
- Plan-based rate limits (starter vs pro vs agency)
- Burst rate limiting
- IP-based rate limiting for abuse prevention
- Tenant-level rate limiting

### 4. **Resource Quotas** ⚠️ LOW PRIORITY
**Status**: Basic site/message limits, missing advanced quotas

**Missing**:
- Document storage limits per plan
- Conversation retention policies
- Webhook delivery attempt limits
- API key limits per tenant

### 5. **Admin vs Member API Access** ⚠️ HIGH PRIORITY
**Status**: Not implemented

**Missing**:
- Role verification in dashboard API routes
- Member-only APIs vs admin-only APIs
- Audit logging for admin actions
- Team management permission enforcement

### 6. **Multi-Tenant Security** ⚠️ CRITICAL
**Status**: Partially implemented

**Current**: Basic tenant isolation via tenant_id checks
**Missing**:
- Cross-tenant data access prevention auditing
- Tenant-scoped API key validation
- Resource sharing controls between tenants

## Recommendations

### Immediate Actions (High Priority)

1. **Implement Role-Based API Protection**
   ```typescript
   // Add to auth-middleware.ts
   export function requireRole(roles: string[]) {
     return async (req: AuthenticatedRequest) => {
       const userRole = await getUserRole(req.userId, req.tenantId);
       if (!roles.includes(userRole)) {
         throw new Error('Insufficient permissions');
       }
     };
   }
   ```

2. **Add Plan-Based Feature Gates**
   ```typescript
   // Add to limits.ts
   export const PLAN_FEATURES = {
     starter: ['basic_analytics', 'email_escalation'],
     pro: ['advanced_analytics', 'slack_integration', 'api_access'],
     agency: ['custom_integrations', 'priority_support', 'advanced_rules']
   };
   ```

3. **Enhance API Route Protection**
   - Add role checks to all dashboard APIs
   - Implement plan feature checks before allowing access
   - Add comprehensive audit logging

### Medium-Term Improvements

1. **Advanced Rate Limiting**
   - Implement plan-based rate limits
   - Add burst protection
   - Create tenant-level quotas

2. **Resource Management**
   - Document storage quotas
   - Conversation retention policies
   - Enhanced usage tracking

### Long-Term Enhancements

1. **Advanced RBAC**
   - Custom role definitions
   - Permission inheritance
   - Resource-level permissions

2. **Compliance Features**
   - Data retention controls
   - Audit trail completeness
   - Cross-tenant access monitoring

## Security Considerations

1. **Current Strengths**:
   - Strong tenant isolation in database queries
   - Secure API key generation and validation
   - Proper authentication via Clerk
   - CORS protection for widget endpoints

2. **Areas for Improvement**:
   - Add comprehensive input validation
   - Implement request signing for webhooks
   - Add anomaly detection for usage patterns
   - Enhance logging for security events

## Implementation Priority Matrix

| Feature | Priority | Effort | Impact |
|---------|----------|--------|---------|
| Role-based API protection | HIGH | Medium | High |
| Plan feature gates | HIGH | Medium | High |
| Enhanced rate limiting | MEDIUM | Low | Medium |
| Resource quotas | LOW | Medium | Low |
| Advanced RBAC | LOW | High | Medium |

---

**Last Updated**: November 2024  
**Next Review**: December 2024
