1) Primary Onboarding (one-time per user/org)

Goal: get them “in” with confidence, no tech hurdles.

Auth (Clerk) → Create/Join Company (Org) → Pick Plan → Stripe Checkout → Welcome

Land in the dashboard with a first-run checklist. Top CTA: “Add your first website”.

Keep a skippable inline prompt (“Add website now”) for motivated users, but don’t block the finish line on code install.

Why this rocks

Fewer blockers up front: don’t lose signups because someone can’t install a snippet right away.

Clear conversion funnel: signup → plan → paid is measurable before technical steps.

Team invites early: owners can invite devs/marketers to complete install later.

2) Property Setup (repeatable per domain/app)

Goal: scalable, multi-domain friendly install/verify loop.

Add Website (domain/app name + URL)

Install Code (tabs: Script, Meta tag, WordPress/GTM)

Verify (button triggers check; show status badges; retry)

Per-site settings: optional AI tone override, languages, branding

Support multiple websites from day one: Websites list with statuses: Pending, Installed, Verified, Error.

Why this rocks

Multi-domain by design: agencies and bigger customers add many sites over time.

Ownership clarity: verification is tracked per site (not per tenant).

Nice failure paths: users can step away and come back; retries don’t break the account.

Minimal tech changes to support this
Data model (additions)

sites

id uuid pk, tenant_id uuid fk tenants, domain text, display_name text

status text (pending|installed|verified|failed), verification_method text (script|meta)

verification_token text, script_key text (unique per site), verified_at timestamptz

default_tone text null (optional per-site override), created_at

uniques: (tenant_id, domain)

(optional) site_events for audit (“install detected”, “verify failed”)

API (tweaks/new)

POST /api/sites → create site { domain, displayName } → { id, script_key }

GET /api/sites / GET /api/sites/:id → list/status

POST /api/sites/:id/verify → run verification; returns { ok, status, details }

Extend widget:

GET /api/widget?t=<tenantId>&s=<siteId>&voice=<tone>

Script uses siteId + script_key to prevent cross-site reuse

(Already in your spec) /api/widget/verify can be implemented as a thin wrapper around POST /api/sites/:id/verify.

RLS/Usage gating (nice and tidy)

Gate max sites per plan (limits.sitesPerTenant[plan]).

Count verified sites for feature unlocks (e.g., escalations).

Store siteId on conversations/messages (nullable for demo/testing).

UX details that make this sing

Dashboard checklist (visible until complete):

Invite teammates (optional)

Add a website

Install code

Verify install

(Optional) Ingest docs / set AI tone

Website list with badges and quick actions: Verify, Copy snippet, Email instructions, Open GTM guide.

Verification UX: polling with friendly states, clear errors (“We couldn’t find your meta tag on https://… Try again?”).

AI tone: tenant-level default; per-site override (so agencies can match each client’s brand voice).

Demo Sandbox: give them a hosted demo page where the widget is already live, so they can test before install.

Migration from your current 3-step flow

Replace with Primary Onboarding (auth → company → plan/payment → done).

Put Property Setup behind “Websites” in nav and as the post-onboarding CTA.

Keep an optional inline prompt at the end of onboarding (“Add website now”) that launches the property wizard.

Acceptance checks

A user can complete account creation and payment without installing code.

Multi-site tenants can add/verify multiple domains independently.

Widget requests include siteId; verification prevents cross-tenant reuse of a snippet.

Progress is persisted; users can abandon property setup and resume later.

Plan limits enforce max sites per tenant cleanly.