# HelpNinja – Complete Features Inventory

Scope
- Stack: Next.js 15 (App Router), Node runtime for DB/AI, Postgres (pgvector + tsvector), OpenAI, Stripe
- Multi-tenant SaaS with an embeddable chat widget, RAG answers, usage gating, and human escalation

Big picture
- Embeddable widget calls /api/chat with tenant/session
- Chat pipeline: usage gate → hybrid RAG (vector + lexical) → OpenAI → persist → optional escalation → usage increment
- Admin dashboard shows usage, docs, integrations health; CRUD pages for documents, integrations, conversations, and settings are present.

Core features (present)
- Widget embed
  - /api/widget returns a JS snippet; toggles a floating panel; posts to /api/chat with JSON body including tenantId and sessionId. Uses absolute origin so it works cross-origin.
  - Files: src/app/api/widget/route.ts
- Chat + RAG + escalation
  - /api/chat (CORS enabled) resolves tenant, gates usage, performs searchHybrid, calls OpenAI, persists messages, enqueues escalation under a confidence threshold.
  - Files: src/app/api/chat/route.ts, src/lib/rag.ts, src/lib/usage.ts
- Hybrid RAG search
  - Vector: pgvector similarity on chunks.embedding; Lexical: tsvector rank; merged and deduped.
  - Files: src/lib/rag.ts; relies on public.chunks(url, content, embedding vector, tsv tsvector, tenant_id)
- Ingestion pipeline
  - API endpoint ingests URL/sitemap, crawls, chunks, embeds, inserts documents/chunks.
  - Files: src/app/api/ingest/route.ts, src/lib/crawler.ts, src/lib/chunk.ts, src/lib/embeddings.ts
- Usage gating
  - Monthly counters per tenant; auto-init + monthly reset; enforce PLAN_LIMITS before AI calls; increment after.
  - Files: src/lib/usage.ts, src/lib/limits.ts
- Integrations + outbox
  - Provider interface (email/slack supported); registry + dispatch; failed sends go to integration_outbox; retry via API.
  - Files: src/lib/integrations/types.ts, src/lib/integrations/registry.ts, src/lib/integrations/dispatch.ts, src/app/api/integrations/outbox/**
- Billing
  - Checkout/portal endpoints; Stripe webhook updates tenant plan/status and ensures usage counters.
  - Files: src/app/api/billing/**, src/app/api/stripe/webhook/route.ts, src/lib/stripe.ts
- Dashboard
  - KPI cards (conversations, usage this month, low-confidence, active integrations), sources indexed, integrations list, usage panel.
  - Tenant resolved server-side; outbox retry button.
  - Files: src/app/dashboard/page.tsx, src/components/sidebar.tsx, src/lib/auth.ts
- Admin pages
  - Documents: src/app/dashboard/documents/page.tsx and DELETE API src/app/api/documents/[id]/route.ts
  - Integrations: src/app/dashboard/integrations/page.tsx plus src/app/api/integrations/[id]/route.ts and /status/route.ts
  - Conversations: src/app/dashboard/conversations/page.tsx
  - Settings + Keys: src/app/dashboard/settings/page.tsx and scaffolded src/app/api/tenants/[id]/rotate-keys/route.ts
- Chat preview
  - Component renders the real widget in an iframe for admins.
  - Files: src/components/chat-preview.tsx
- DB access
  - pg Pool with Supabase-friendly SSL (cloud: no-verify; local: no SSL); parameterized queries.
  - Files: src/lib/db.ts
- Seed data
  - Script to create a demo tenant (+keys if required), a sample doc/chunks, a conversation/messages, and optional integration; pgvector-friendly inserts.
  - Files: scripts/seed.mjs

Security and conventions
- Tenant resolution via headers/cookies/env; keep all queries tenant-scoped.
- Stripe webhook uses raw body and Node runtime.
- CORS on /api/chat for widget origins.
- Use lib/db.ts query() with parameters; avoid string interpolation.
- Keep Node runtime for routes that hit DB/OpenAI.

What’s partial or pending
- Conversation detail transcript page (optional)
- Tests: unit/integration for usage gating, RAG, escalation, billing.
- Auth model: auth.ts is a stub; tenant passed via headers/env (prod hardening).
- Rate limiting beyond plan gates.
- RLS policies if using Supabase auth directly.

How to validate quickly
- Seed: npm run seed (requires DATABASE_URL)
- Dev: npm run dev and open http://localhost:3001/dashboard
- Widget: <script src="http://localhost:3001/api/widget?t=YOUR_TENANT_PUBLIC_KEY&voice=friendly" async></script>
- Chat: POST http://localhost:3001/api/chat with { tenantId, message, sessionId } JSON
- Outbox: trigger low-confidence to enqueue; use dashboard retry to process

Key files index
- Widget: src/app/api/widget/route.ts
- Chat: src/app/api/chat/route.ts
- RAG: src/lib/rag.ts
- Usage gates: src/lib/usage.ts, src/lib/limits.ts
- Ingest: src/app/api/ingest/route.ts, src/lib/crawler.ts, src/lib/chunk.ts, src/lib/embeddings.ts
- Billing: src/app/api/billing/**, src/app/api/stripe/webhook/route.ts, src/lib/stripe.ts
- Integrations: src/lib/integrations/**
- Dashboard: src/app/dashboard/**, src/components/sidebar.tsx
- DB: src/lib/db.ts
- Seed: scripts/seed.mjs
