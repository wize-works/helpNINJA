# Feature Tracking — User Onboarding with Clerk Elements

Purpose
- Track the end-to-end implementation of the “User Onboarding (Auth → Company → Plan/Payment → Done)” flow using Clerk Elements, integrating with existing billing and dashboard features.

Current state (verified)
- Site onboarding (3-step for website install) already exists: `src/app/(pages)/onboarding/**` with progress/navigation components.
- Billing is implemented: `/api/billing/checkout`, `/api/billing/portal`, Stripe webhook at `src/app/api/stripe/webhook/route.ts`, Stripe helper at `src/lib/stripe.ts`.
- Multi-site support exists (tenant_sites + verification APIs): `src/app/api/sites/**` and DB migrations in `src/sql/055_complete_migration.sql` and `src/sql/056_site_scoped_content.sql`.
- Auth integration with Clerk added (Elements-based auth screens, ClerkProvider, middleware). A Clerk webhook (`/api/clerk/webhook`) verifies via Svix and upserts users into `public.users` on `user.created`/`user.updated`. `lib/auth.ts` tenant resolver still pending.

Non-goals
- Do not change or duplicate the existing site onboarding/verification flow.
- Do not alter billing API behavior; only reuse it from the new flow.

High-level milestones
1) M1 — Base Clerk Setup (Auth screens with Elements)
2) M2 — Organization ↔ Tenant mapping
3) M3 — Plan selection and Stripe Checkout
4) M4 — Done/redirect and dashboard handoff
5) M5 — Telemetry, security, and polish

Dependencies & env
- Add Clerk keys: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
- Keep existing Stripe env vars (already used).
- Database: Postgres via `lib/db.ts`; add minimal schema for Clerk mapping.

Implementation checklist (tracked)

M1 — Base Clerk Setup
- [x] Add deps: `@clerk/nextjs` and `@clerk/elements`.
- [x] Wrap root layout with `ClerkProvider` (file: `src/app/layout.tsx`).
- [x] Add middleware to mark public routes and enable Clerk (file: `middleware.ts`).
- [x] Create `src/app/(pages)/auth/signin/page.tsx` and `src/app/(pages)/auth/signup/page.tsx` using Clerk Elements.
- [x] Redirect on success to `/onboarding/company`.
 - [x] Wire titlebar user menu “Sign Out” to Clerk sign-out with redirect to `/`.
 - [x] Persist users via Clerk webhook (svix-verified). Removed temporary client-side `/api/me/sync` call from titlebar.

M2 — Organization ↔ Tenant mapping
- [x] Database migration for user identity mapping:
  - Option A (chosen): add `clerk_user_id text unique` to `public.users` and `clerk_org_id text unique` to `public.tenants`; sync on first sign-in and org selection. (Added `src/sql/058_clerk_mapping.sql`)
- [ ] Organization step UI at `/onboarding/company` (create/join organization):
  - [ ] On “create org”: insert tenant, map `clerk_org_id → tenant_id`, add current user to `tenant_members` as owner.
  - [ ] On “join org”: look up map to resolve `tenant_id`, ensure membership exists.
- [ ] Server utility: derive `tenant_id` from Clerk session + org context; update `src/lib/auth.ts` accordingly.

M3 — Plan selection and Stripe Checkout
- [ ] `/onboarding/plan` page with plan cards (Starter/Pro/Agency, monthly/yearly toggle).
- [ ] Call existing `/api/billing/checkout` with `{ plan }` (tenant resolved server-side) and redirect to Stripe.
- [ ] On return URL, confirm subscription via existing webhook; show success state.

M4 — Done/redirect and dashboard handoff
- [ ] `/onboarding/done` page with success, confetti, and CTA: “Add your first website” → `/dashboard/sites` or `/onboarding` (existing site flow).
- [ ] Ensure post-onboarding nav shows Websites entry and billing status.

M5 — Telemetry, security, and polish
- [ ] Telemetry events (table present via `src/sql/057_telemetry_events.sql`):
  - user.signup.view/success/error; user.company.created/joined; user.plan.selected; user.payment.start/success/cancel/error; user.onboarding.done
- [ ] Rate-limit auth endpoints if needed; ensure public routes include widget/chat.
- [ ] A11y pass on Elements forms; mobile min-width 360px.
- [ ] Docs update: add short guide linking to Clerk Elements and our routes.

Contracts (mini)
- Inputs
  - Clerk session (user + org selection), selected `plan` string.
- Outputs
  - Created/linked `tenant_id`, Stripe session redirects, dashboard access.
- Error modes
  - Missing env keys; DB migration incomplete; webhook not confirming subscription.
- Success criteria
  - User completes account/company/plan/payment without touching website install; lands in dashboard with CTA to Websites.

Acceptance criteria
- Users can authenticate via Clerk Elements and are mapped to a tenant via organization.
- Plan selection triggers Stripe Checkout; webhook updates `tenants.plan_status`.
- Completion lands on `/onboarding/done` with a working “Add your first website” CTA.
- No duplication of site onboarding; existing 3-step site flow remains intact.

Rollout plan
- Ship M1 behind a soft flag by routing links from marketing to `/auth/*` only in dev/staging.
- Enable M2–M4 in staging; verify multi-user/org membership edge cases.
- Add tracking; compare conversion with legacy site onboarding entry point.

Risks & mitigations
- Schema choice drift (Option A vs B): document chosen approach and migrate once; write idempotent SQL.
- Tenant resolution conflicts: centralize in `lib/auth.ts` and use it in server routes.
- Stripe return race: rely on webhook for source of truth; show pending state until confirmed.

References
- Clerk Elements overview: https://clerk.com/docs/customization/elements/overview
- Flow spec files: `docs/development/onboarding-user-flow.json`, `docs/development/onboarding-details.md`
- Related code: billing (`src/app/api/billing/**`), webhook (`src/app/api/stripe/webhook/route.ts`), site management (`src/app/api/sites/**`)

Owners & status
- Eng: TBD  | Design: TBD  | PM: TBD
- Status: Planned
