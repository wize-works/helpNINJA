# Duplicate Customer Creation Fix

## Problem Identified

**Issue**: The signup flow was creating duplicate Stripe customers for the same email address, even though there were no duplicate users or tenants in the database.

**Root Cause**: The `StripeCheckout` component in `/src/components/stripe-checkout.tsx` was making multiple API calls to `/api/signup/create-checkout`, each potentially creating a new Stripe customer due to race conditions.

### Specific Issues:

1. **Multiple API Calls**: The component made separate calls to create-checkout for:
   - Initial checkout setup in `fetchClientSecret()`
   - Coupon code application in `applyCoupon()`

2. **Race Condition**: When users quickly entered coupon codes, both the initial fetch and coupon application could execute concurrently, both seeing `stripe_customer_id` as `null` in the database and creating separate customers in Stripe.

3. **No Concurrency Protection**: The existing `hasFetched` flag only prevented multiple initial fetches but didn't prevent the coupon application from making additional API calls.

## Solution Implemented

### 1. Frontend Fixes (`/src/components/stripe-checkout.tsx`)

- **Consolidated API Calls**: Created a single `createCheckout()` function that handles both initial setup and coupon application
- **Concurrency Protection**: Added `isCreatingCheckout` flag to prevent multiple simultaneous API calls
- **Improved State Management**: Unified the checkout creation logic to avoid duplicate requests

### 2. Backend Fixes (API Routes)

- **Database Transactions**: Added transaction support to `/src/lib/db.ts`
- **Transactional Customer Creation**: Wrapped customer lookup and creation in database transactions for all checkout routes:
  - `/api/signup/create-checkout/route.ts`
  - `/api/signup/checkout/route.ts`
  - `/api/billing/checkout/route.ts`

### 3. Transaction Implementation

```typescript
// Before: Race condition possible
const customer = await stripe.customers.create({...});
await query('UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2', [customer.id, tenantId]);

// After: Atomic operation
const customerId = await transaction(async (txQuery) => {
  const tenant = await txQuery('SELECT stripe_customer_id FROM tenants WHERE id = $1', [tenantId]);
  if (!tenant.stripe_customer_id) {
    const customer = await stripe.customers.create({...});
    await txQuery('UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2', [customer.id, tenantId]);
    return customer.id;
  }
  return tenant.stripe_customer_id;
});
```

## Files Modified

### Frontend:
- `/src/components/stripe-checkout.tsx` - Consolidated API calls and added concurrency protection

### Backend:
- `/src/lib/db.ts` - Added transaction support
- `/src/app/api/signup/create-checkout/route.ts` - Added transactional customer creation
- `/src/app/api/signup/checkout/route.ts` - Added transactional customer creation
- `/src/app/api/billing/checkout/route.ts` - Added transactional customer creation

## Testing Recommendations

1. **Manual Testing**: Test the signup flow with rapid coupon code entry
2. **Load Testing**: Simulate multiple concurrent signups for the same organization
3. **Stripe Monitoring**: Monitor Stripe dashboard for duplicate customer creation
4. **Database Integrity**: Verify that `stripe_customer_id` is consistently set

## Prevention Measures

1. **Database Constraints**: Consider adding a unique constraint on `stripe_customer_id` in the tenants table
2. **Idempotency Keys**: Consider using Stripe's idempotency keys for customer creation
3. **Frontend Debouncing**: Add debouncing to coupon code application
4. **Monitoring**: Add logging to track customer creation events

## Related Code Patterns

This fix establishes a pattern for preventing race conditions in Stripe integrations:

```typescript
// Always use transactions for external API calls that modify database state
const result = await transaction(async (txQuery) => {
  const existing = await txQuery('SELECT external_id FROM table WHERE id = $1', [id]);
  if (!existing.external_id) {
    const external = await externalAPI.create({...});
    await txQuery('UPDATE table SET external_id = $1 WHERE id = $2', [external.id, id]);
    return external.id;
  }
  return existing.external_id;
});
```

This pattern should be applied to any similar integrations (e.g., other payment providers, external services).
