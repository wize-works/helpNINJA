# helpNINJA Security

## Auth
- Supabase Auth, JWT-based sessions

## Data
- Encrypted storage for integration tokens
- Row Level Security

## Network
- HTTPS enforced
- Secure webhook handling

## App-specific controls
- Usage gating before AI calls: `usage.canSendMessage`, reset monthly, plan limits in `lib/limits.ts`
- Tenant isolation in all queries: pass `tenantId` and parameterize SQL via `lib/db.query`
- Stripe webhook verification: use raw body (`req.text()`) and `stripe.webhooks.constructEvent`
