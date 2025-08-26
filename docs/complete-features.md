# helpNINJA – Complete Features Inventory

Scope
- Stack: Next.js 15 (App Router), Node runtime for DB/Postgres (pgvector + tsvector), OpenAI, Stripe
- Multi-tenant SaaS with an embeddable chat widget, RAG answers, usage gating, and human escalation

What's partial or pending
- Conversation detail transcript page (optional)
- Tests: unit/integration for usage gating, RAG, escalation, billing.
- Auth model: Strict for admin/dashboard via Clerk org → tenant (getTenantIdStrict). Legacy header/env resolver remains only for public/widget contexts.
- Rate limiting beyond plan gates.
- RLS policies if using Supabase auth directly.
- Team invitation emails: Infrastructure is ready but sendInvitationEmail() function not implemented (src/app/api/team/invitations/route.ts line 129)

Big picture
- Embeddable widget calls /api/chat with tenant/session
- Chat pipeline: usage gate → hybrid RAG (vector + lexical) → OpenAI → persist → optional escalation → usage increment
- Admin dashboard shows usage, docs, integrations health; CRUD pages for documents, integrations, conversations, and settings are present.

Core features (present)

- Signup & Onboarding Flow
  - Complete signup flow with user registration, organization creation, and plan selection
  - **Synchronous tenant creation**: Tenants are created immediately when organizations are created, eliminating 2-5 minute wait times for webhooks
  - Auto-generated unique slugs prevent duplicate tenant slug errors  
  - Plan selection step with Starter ($29), Pro ($79), and Agency ($199) tiers
  - Sets plan status to 'trialing' initially, allowing billing to be completed later
  - **Improved UX**: Users proceed instantly from organization creation to plan selection with no delays
  - **Webhook redundancy**: Clerk webhooks still work as backup/sync mechanism with idempotent operations
  - Files: src/app/(pages)/auth/signup/page.tsx, src/components/plan-selection.tsx, src/app/api/signup/select-plan/route.ts, src/app/api/signup/create-checkout/route.ts, src/lib/slug.ts

- Widget embed and configuration
  - /api/widget returns a JS snippet; toggles a floating panel; posts to /api/chat with JSON body including tenantId and sessionId. Uses absolute origin so it works cross-origin.
  - Now uses DaisyUI chat bubbles for proper styling (chat-start/chat-end classes)
  - Automatically loads DaisyUI CSS for consistent styling
  - Enhanced chat preview component with DaisyUI button styles
  - Real-time widget preview in configuration UI shows instant feedback as settings are changed
  - Dedicated widget configuration page with appearance, behavior, and content tabs
  - Interactive preview simulates chat interactions and displays configuration changes in real-time
  - Files: src/app/api/widget/route.ts, src/components/chat-preview.tsx, src/components/chat-widget-panel.tsx, src/components/widget-configuration.tsx, src/app/dashboard/widget/page.tsx
- Chat + RAG + escalation
  - /api/chat (CORS enabled) resolves tenant, gates usage, performs searchHybrid, calls OpenAI, persists messages, enqueues escalation under a confidence threshold using the centralized escalation service.
  - Files: src/app/api/chat/route.ts, src/lib/rag.ts, src/lib/usage.ts, src/lib/escalation-service.ts
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
  - Provider interface (email/slack supported); registry + dispatch through centralized escalation service; failed sends go to integration_outbox; retry via API.
  - Files: src/lib/integrations/types.ts, src/lib/integrations/registry.ts, src/lib/escalation-service.ts, src/app/api/outbox/retry/route.ts
- Billing
  - Checkout/portal endpoints; Stripe webhook updates tenant plan/status and ensures usage counters.
  - Files: src/app/api/billing/**, src/app/api/stripe/webhook/route.ts, src/lib/stripe.ts
- Dashboard
  - KPI cards (conversations, usage this month, low-confidence, active integrations), sources indexed, integrations list, usage panel.
  - Tenant resolved strictly server-side (Clerk org → tenant); outbox retry button.
  - Files: src/app/dashboard/page.tsx, src/components/sidebar.tsx, src/lib/tenant-resolve.ts
  - Notes: "Messages (this month)" derives from `public.messages` for the current calendar month, counting `role='user'` messages (aligned with the Chat Volume chart). Low-confidence counts use assistant messages with confidence < 0.55 in the same period.
- Admin pages
  - Documents: src/app/dashboard/documents/page.tsx and DELETE API src/app/api/documents/[id]/route.ts
    - Document statistics: chunk count, total tokens, content length surfaced in dashboard table (new columns + sorting by chunks/tokens). Derived live via LEFT JOIN aggregate on public.chunks (no duplicate storage). Sort keys: chunks_desc/asc, tokens_desc/asc. Zero-chunk docs highlighted with warning badge.
  - Integrations: src/app/dashboard/integrations/page.tsx plus src/app/api/integrations/[id]/route.ts and /status/route.ts
  - Conversations: src/app/dashboard/conversations/page.tsx
  - Settings + Keys: src/app/dashboard/settings/page.tsx and scaffolded src/app/api/tenants/[id]/rotate-keys/route.ts
  - API Keys Management: src/app/dashboard/settings/api/page.tsx for advanced API key and webhook management
- Webhook Event System (NEW - Production-ready implementation)
  - Event Dispatching: Automatic webhook delivery for conversation.started, message.sent, escalation.triggered, document.ingested events
  - Delivery Tracking: Complete audit trail with retry logic, status tracking, and response monitoring  
  - Security: HMAC signature verification, API key authentication, tenant isolation
  - Management: Full CRUD operations via dashboard UI and API endpoints
  - API routes: src/app/api/webhooks/route.ts (list/create), src/app/api/webhooks/[id]/route.ts (get/update/delete), src/app/api/webhooks/[id]/test/route.ts (test delivery)
  - Core system: src/lib/webhooks.ts (dispatch), src/lib/webhook-retry.ts (retry logic), src/app/api/webhooks/debug/route.ts (debugging)
  - Database: webhook_endpoints, webhook_deliveries tables with comprehensive tracking
  - Features: Real-time delivery status, test webhooks, retry with exponential backoff, admin debugging tools
- Dual API key system (NEW - Comprehensive guidance added)
  - Widget Keys: Basic tenant keys (public_key, secret_key) from tenants table for chat widget integration
    - Located: src/app/dashboard/settings/page.tsx 
    - Purpose: Simple widget embedding and basic authentication
    - Public key: Safe for client-side use in widget scripts
    - Secret key: Server-side authentication for tenant operations
    - Features: Key rotation, widget preview, embed code generation
  - Managed API Keys: Advanced programmatic access keys from api_keys table
    - Located: src/app/dashboard/settings/api/page.tsx
    - Purpose: Granular permissions, usage tracking, rate limiting
    - Key types: Public (read), Secret (write), Webhook (endpoint auth)
    - Features: Permission scoping, usage analytics, expiration dates, rate limits
    - Integration: Full API documentation, curl examples, best practices guide
- Chat preview
  - Component renders the real widget in an iframe for admins.
  - Files: src/components/chat-preview.tsx
 - Notifications (MVP In Progress)
  - Schema + service for in-app notifications (notifications, notification_recipients, notification_preferences)
  - API: /api/notifications, /api/notifications/unread-count, /api/notifications/mark-all-read, /api/notifications/[id]/read, /api/notification-preferences (GET/PATCH), /api/internal/notifications (POST)
  - Escalation events automatically generate notifications (low confidence, handoff, rule matches)
  - Pending UI: bell, feed panel, preferences management, rule direct notification creation
  - Files: src/sql/063_notifications.sql, src/lib/notifications.ts, src/app/api/notifications/**, src/app/api/notification-preferences/route.ts, src/app/api/internal/notifications/route.ts, src/lib/escalation-service.ts (integration)
- Site management (NEW - Phase 1 completed)
  - Multi-site registration and domain verification system for tenants
  - API routes: src/app/api/sites/route.ts, src/app/api/sites/[id]/route.ts, src/app/api/sites/[id]/verify/route.ts
  - Components: src/components/site-manager.tsx, src/components/site-selector.tsx, src/components/domain-verification.tsx
  - Database: tenant_sites table with verification tokens and status tracking
  - Domain validation: Widget validates allowed origins per tenant (updated src/app/api/widget/route.ts)
  - Script key enforcement: Each site has a unique script_key returned by POST /api/sites; widget requires t (tenant public key) + s (site id) + k (site key), preventing cross-tenant snippet reuse
  - Onboarding Install step now generates site-specific embed code and includes a site selector
  - Site-specific content: Documents and chunks associated with specific tenant sites (updated src/app/api/ingest/route.ts)
- Onboarding experience (NEW - Phase 2 completed)
  - Complete 3-step onboarding flow: account setup → site registration → widget installation
  - Pages: src/app/(pages)/onboarding/step-1/page.tsx, step-2/page.tsx, step-3/page.tsx
  - Components: src/components/onboarding-progress.tsx, src/components/onboarding-navigation.tsx
  - Features: Progress tracking, site registration with verification, live widget preview, installation guide
  - Layout: Custom onboarding layout with branded header and streamlined UX
  - Dashboard-embedded modal: Site onboarding wizard is available directly from the dashboard Quick Start banner and opens as a modal, not a separate page
    - Files: src/components/site-wizard-modal.tsx (modal), src/components/quickstart-actions.tsx (launcher), wired in src/app/dashboard/page.tsx
- DB access
  - pg Pool with Supabase-friendly SSL (cloud: no-verify; local: no SSL); parameterized queries.
  - Files: src/lib/db.ts
- Seed data
  - Script to create a demo tenant (+keys if required), a sample doc/chunks, a conversation/messages, and optional integration; pgvector-friendly inserts.
  - Files: scripts/seed.mjs

Security and conventions
- Admin/dashboard tenant resolution is strict (Clerk org → tenant) and does not trust client headers/cookies/env.
- Widget/public endpoints accept a tenant identifier in the body and map to internal tenant id; CORS allows only 'content-type' header.
- Stripe webhook uses raw body and Node runtime.
- CORS on /api/chat for widget origins.
- Use lib/db.ts query() with parameters; avoid string interpolation.
- Keep Node runtime for routes that hit DB/OpenAI.
  - Optional CORS allowlist for chat: set `ALLOWED_WIDGET_ORIGINS` to a comma-separated list (e.g., `https://example.com,https://app.example.com`). If unset, any origin is allowed.

UX guidance patterns (NEW - Comprehensive in-app help)
- Contextual guidance: Alert components on key pages explaining feature purposes and relationships
- Progressive disclosure: Clear distinction between basic (widget keys) and advanced (managed API keys) features
- Cross-linking: Smart navigation between related features (widget keys ↔ API keys)
- Visual hierarchy: DaisyUI alert components with icons, typography, and color coding
- Documentation integration: Comprehensive API guides, curl examples, and best practices directly in UI
- Status indicators: Clear badges for key types, expiration states, and active/inactive states
- Empty states: Helpful guidance when no data exists, explaining next steps and feature benefits

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
- Settings & API Keys: src/app/dashboard/settings/page.tsx, src/app/dashboard/settings/api/page.tsx
- UX Components: src/components/ui/stat-card.tsx, src/lib/toast.ts
- DB: src/lib/db.ts
- Seed: scripts/seed.mjs
