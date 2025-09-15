# helpNINJA – Complete Features Inventory

Scope
- Stack: Next.js 15 (App Router), Node runtime for DB/Postgres (pgvector + tsvector), OpenAI, Stripe
- Multi-tenant SaaS with an embeddable chat widget, RAG answers, usage gating, and human escalation

What's partial or pending
- **Widget Chat History Persistence**: Chat history persistence across page navigations (comprehensive implementation plan documented in docs/development/widget-chat-history-persistence.md)
- Conversation detail transcript page (optional)
- Tests: unit/integration for usage gating, RAG, escalation, billing.
- Auth model: Strict for admin/dashboard via Clerk org → tenant (getTenantIdStrict). Legacy header/env resolver remains only for public/widget contexts.
- Rate limiting beyond plan gates.
- RLS policies if using Supabase auth directly.

## ✅ SECURITY & ACCESS CONTROL (NEW - Enterprise-grade implementation)

### User Invitation System - **COMPLETE** ✅
**Location:** Team management APIs, components, and Clerk integration
**Status:** Fully implemented and build-tested with proper client/server code separation

**Features:**
- **Complete invitation flow**: Create, send, accept, resend, and cancel invitations with proper Clerk authentication integration
- **Role-based permissions**: Users can only invite roles they're authorized to assign (owners > admins > analysts > support > viewers)
- **Secure token system**: Cryptographically secure invitation tokens with 7-day expiry and automatic cleanup
- **Clerk integration**: Automatic Clerk user creation and organization membership during invitation acceptance
- **Email delivery**: Professional email templates with fallback handling for delivery failures
- **Real-time management**: Live team member management with role editing, status updates, and removal
- **Permission validation**: Comprehensive security preventing role escalation attacks and unauthorized actions
- **Transaction safety**: Database operations use transactions with rollback on failures for data consistency
- **Audit logging**: Complete activity tracking for all team management operations
- **Build optimization**: Proper separation of client-safe utilities from server-only database operations for webpack compatibility

**Components:**
- `src/components/add-team-member-form.tsx` - Invitation creation with role validation (client-safe)
- `src/components/team-member-card.tsx` - Individual member management with permissions
- `src/components/team-invitations.tsx` - Pending invitations with resend/cancel actions
- `src/app/dashboard/team/page.tsx` - Complete team management interface
- `src/app/(pages)/invite/[token]/page.tsx` - Invitation acceptance with Clerk flow

**API Endpoints:**
- `POST /api/team/invitations` - Create invitation with permission validation
- `PUT /api/team/invitations` - Resend invitation with new token
- `DELETE /api/team/invitations` - Cancel pending invitation
- `GET /api/team/invitations` - List pending invitations
- `GET /api/team` - List team members with role filtering
- `PUT /api/team/[userId]` - Update member role/status with permission checks
- `DELETE /api/team/[userId]` - Remove team member with validation
- `GET /api/invitations/[token]` - Get invitation details for acceptance
- `POST /api/invitations/[token]/accept` - Accept invitation (consolidated flow: creates Clerk user if needed, adds to Clerk org when available, creates internal user, adds tenant membership, completes invite, returns signin URL)
- `POST /api/invitations/[token]` - DEPRECATED (returns 410). Use `/api/invitations/[token]/accept` instead.

**Security Features:**
- Role hierarchy enforcement with assignable role validation
- Owner role protection (cannot be modified, assigned, or removed)
- Last admin protection (cannot remove the last admin from a team)
- Self-modification prevention (users cannot modify their own roles)
- Input validation and comprehensive error handling with user-friendly messages
- Graceful Clerk integration with fallback handling for API failures

**Database Integration:**
- `tenant_member_invitations` - Secure invitation storage with expiry tracking
- `public.tenant_members` - Team membership with role and status management
- `public.team_activity` - Complete audit trail for team operations
- Clerk organizations mapped to tenants for authentication integration

**Technical Implementation:**
- `src/lib/team-permissions.ts` - Server-side permission validation (database operations)
- `src/lib/role-utils.ts` - Client-safe role hierarchy utilities (no database imports)
- Proper client/server separation prevents webpack build errors with Node.js modules
- Role utilities safely imported in client components without triggering database imports

### Role-Based Access Control (RBAC) - **COMPLETE**
**Location:** `src/lib/rbac.ts`
**Features:**
- Complete role hierarchy: owner > admin > analyst > support > viewer
- User role checking: `getUserRole()`, `hasRole()`, `roleHierarchyCheck()`
- Permission system with role-based permissions
- Team member management controls: `canManageUser()`
- Database integration with `public.tenant_members` table

### Plan-Based Feature Gating - **COMPLETE**
**Location:** `src/lib/plan-features.ts`
**Features:**
- Plan feature mapping for starter/pro/agency plans
- Feature checking: `hasFeature()`, `requireFeature()`
- Integration marketplace access (pro/agency plans get open access)
- Upgrade suggestions with plan comparisons
- Usage limit enforcement

**Current Plan Features:**
- **Starter**: Basic chat, limited integrations, standard analytics
- **Pro**: Advanced analytics, integration marketplace access, priority support
- **Agency**: All features, white-label options, custom integrations

### Enhanced Authentication Middleware - **COMPLETE**
**Location:** `src/lib/auth-middleware.ts`
**Features:**
- API key authentication with permissions
- Session-based authentication with Clerk
- Role requirement middleware: `requireRoles()`, `requireAdmin()`, `requireOwner()`
- Feature requirement middleware: `requireFeatures()`
- Combined role + feature checking: `requireRolesAndFeatures()`

### Comprehensive Audit Logging - **COMPLETE**
**Location:** `src/lib/audit-log.ts`
**Database:** `public.audit_logs` table (see `sql/audit_logs_migration.sql`)
**Features:**
- Security events (login, unauthorized access)
- Team management events (member added/removed/role changed/viewed)
- Billing events (plan changes, subscription updates, portal access)
- Integration events (added/removed/configured)
- API key events (created/deleted/rotated)
- Request metadata capture (IP, user agent, etc.)

### Protected API Routes - **IMPLEMENTED**
**Team Management API** (`src/app/api/team/route.ts`):
- GET: Requires admin/owner role to view team members
- POST: Requires admin/owner role to add team members
- Audit logging for all team operations

**Billing API** (`src/app/api/billing/checkout/route.ts`, `src/app/api/billing/portal/route.ts`):
- Requires admin/owner role for all billing operations
- Audit logging for subscription creation and portal access
- Customer ID validation and security checks

**Integration Access Model:**
- **Starter Plan**: Limited to basic integrations (Slack via env fallback)
- **Pro/Agency Plans**: Full integration marketplace access + custom integrations

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
- **Human Agent Response System (NEW - Complete implementation)**
  - **Real-time human takeover**: Dashboard agents can respond directly to customer conversations with immediate widget delivery
  - **Dashboard real-time polling**: Conversation pages update every 2 seconds to show new customer messages automatically
  - **Widget real-time polling**: Widget polls every 3 seconds for human agent responses with visual flash notifications
  - **Message distinction**: Clear visual badges distinguish AI responses from human agent responses in both dashboard and widget
  - **Database schema**: Added is_human_response, agent_id, session_id columns to messages table for proper tracking
  - **Conversation status tracking**: Conversations automatically marked as 'human_handling' when agents respond
  - **CORS support**: Cross-origin widget polling works across different domains with proper CORS headers
  - **Deduplication**: Smart message deduplication prevents duplicate keys and ensures smooth real-time updates
  - **Authentication**: Uses Clerk session-based authentication for dashboard agents with tenant validation
  - **Auto-scroll**: Dashboard and widget automatically scroll to new messages for optimal UX
  - **Manual escalation**: Dashboard agents can manually escalate conversations with integration selection modal (prevents "spam all integrations" issue)
  - **Conversation sharing**: Generate secure, expiring links to share conversation transcripts with stakeholders
  - Files: src/app/api/conversations/[id]/respond/route.ts (agent response API), src/app/api/conversations/session/[sessionId]/messages/route.ts (widget polling), src/components/agent-response-box.tsx (response UI), src/components/conversation-transcript.tsx (real-time updates), src/app/dashboard/conversations/[id]/page.tsx (conversation detail), src/components/manual-escalation-button.tsx (manual escalation), src/components/escalation-choice-modal.tsx (escalation selection), src/components/share-conversation-button.tsx (conversation sharing), src/app/api/conversations/share/route.ts (share API), src/app/shared/conversation/[token]/page.tsx (shared viewer), src/sql/069_human_agent_support.sql, src/sql/070_conversation_shares.sql (database migrations)
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
  - Provider interface (email/slack/teams/discord supported); registry + dispatch through centralized escalation service; failed sends go to integration_outbox; retry via API.
  - **Microsoft Teams Integration**: Modern Power Automate webhook integration with Adaptive Card formatting, rich message support, and comprehensive setup wizard
  - **Teams Features**: Modern Adaptive Cards, professional layout with logos and action buttons, markdown support, contact information display, reference links
  - **Power Automate Integration**: Uses modern workflow-based webhooks (not deprecated Office 365 connectors), includes detailed Power Automate setup instructions
  - **Discord Integration**: Rich embed-based escalation notifications with color-coded alerts, custom bot appearance, and comprehensive Discord webhook setup
  - **Discord Features**: Rich embeds with emoji icons, color-coded escalation types, clickable links, custom bot username/avatar, organized field layout, timestamp integration
  - **Discord Visual Design**: Dynamic color coding (amber for low confidence, red for restricted content, blue for handoffs, green for user requests), emoji-enhanced field headers, professional footer branding
  - **UI Integration**: Complete configuration UI with provider-specific fields, detailed setup instructions, and marketplace integration (Discord available alongside Slack, Teams, and Email)
  - Files: src/lib/integrations/types.ts, src/lib/integrations/registry.ts, src/lib/integrations/providers/teams.ts, src/lib/integrations/providers/discord.ts, src/lib/escalation-service.ts, src/app/api/outbox/retry/route.ts, src/components/integration-settings-form.tsx, src/app/dashboard/integrations/marketplace/page.tsx
- Billing
  - Checkout/portal endpoints; Stripe webhook updates tenant plan/status and ensures usage counters.
  - Files: src/app/api/billing/**, src/app/api/stripe/webhook/route.ts, src/lib/stripe.ts
- Dashboard
  - KPI cards (conversations, usage this month, low-confidence, active integrations), sources indexed, integrations list, usage panel.
  - Tenant resolved strictly server-side (Clerk org → tenant); outbox retry button.
  - Files: src/app/dashboard/page.tsx, src/components/sidebar.tsx, src/lib/tenant-resolve.ts
  - Notes: "Messages (this month)" derives from `public.messages` for the current calendar month, counting `role='user'` messages (aligned with the Chat Volume chart). Low-confidence counts use assistant messages with confidence < 0.55 in the same period.
- Analytics & Integration Health
  - **Real escalation tracking**: Escalation rate calculated from actual escalations table, not just low-confidence messages
  - **Actual response times**: Calculated from real message pairs instead of mock data  
  - **Integration delivery metrics**: Tracks real integration deliveries and escalations with proper success rates
  - **Complete data sources**: All analytics metrics now pull from real database data including conversation trends, confidence distribution, and top knowledge sources
  - Dashboard showing message volume, escalations, integration status, response times with 30-day trends and growth calculations
  - Files: src/app/dashboard/analytics/page.tsx, src/app/api/analytics/integration-health/route.ts, src/components/analytics/integration-health-dashboard.tsx
- Admin pages
  - Documents: src/app/dashboard/documents/page.tsx and DELETE API src/app/api/documents/[id]/route.ts
    - Document statistics: chunk count, total tokens, content length surfaced in dashboard table (new columns + sorting by chunks/tokens). Derived live via LEFT JOIN aggregate on public.chunks (no duplicate storage). Sort keys: chunks_desc/asc, tokens_desc/asc. Zero-chunk docs highlighted with warning badge.
  - Integrations: src/app/dashboard/integrations/page.tsx plus src/app/api/integrations/[id]/route.ts and /status/route.ts
  - Conversations: src/app/dashboard/conversations/page.tsx
  - **Rules (Escalation Rules)**: Complete CRUD interface with standardized filter implementation following filter-button-guide.md pattern
    - Server-side filtering with URL persistence for search, status (enabled/disabled), rule type, and site association
    - Debounced search with responsive filter dropdown, proper loading states, and visual filter count badges
    - Rule editor with comprehensive form validation, priority sliders, and integrated rule testing interface
    - Files: src/app/dashboard/rules/page.tsx (server-side main page), src/app/dashboard/rules/rules-content.tsx (client component), src/app/dashboard/rules/filter-controls.tsx (standardized filters), src/app/api/rules/route.ts (updated with search support)
  - **Feedback Management**: Complete feedback system with standardized filter implementation following filter-button-guide.md pattern
    - Server-side filtering with URL persistence for search, type, status, priority, and site association
    - Comprehensive feedback analytics with visual charts showing trends, priority distribution, and resolution metrics
    - Advanced feedback table with modal detail views, status management, and escalation tracking
    - Site-specific feedback filtering allows isolation of feedback by verified tenant sites
    - Auto-escalation for urgent/high-priority feedback with centralized escalation service integration
    - Files: src/app/dashboard/feedback/page.tsx (server-side main page), src/app/dashboard/feedback/feedback-content.tsx (client component), src/app/dashboard/feedback/filter-controls.tsx (standardized filters), src/app/api/feedback/route.ts (enhanced with ILIKE search), src/components/feedback-table.tsx, src/components/feedback-analytics.tsx
  - **Outbox (Delivery Status)**: Complete integration delivery monitoring with standardized filter implementation following filter-button-guide.md pattern
    - Server-side filtering with URL persistence for search, status (pending/sent/failed), provider, and escalation rule association
    - Search functionality across integration names, error messages, providers, and rule names for efficient troubleshooting
    - Comprehensive delivery statistics with visual status cards showing sent, pending, and failed delivery counts
    - Bulk retry operations with individual and mass retry capabilities for failed deliveries
    - Real-time delivery status tracking with detailed error reporting and retry attempt logging
    - Files: src/app/dashboard/outbox/page.tsx (server-side main page), src/app/dashboard/outbox/outbox-content.tsx (client component), src/app/dashboard/outbox/filter-controls.tsx (standardized filters), src/app/api/outbox/route.ts (enhanced with ILIKE search), src/components/outbox-table.tsx
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
- Email Template System (NEW - Complete implementation)
  - **Comprehensive HTML email templates** with responsive design and consistent helpNINJA branding
  - **Multiple email types**: Team invitations, escalation notifications, system notifications, custom emails
  - **Modern design features**: Gradient headers, cards, badges, mobile-responsive layouts, accessibility compliance
  - **Automatic template generation**: Both HTML and fallback text versions generated automatically
  - **Integration complete**: Escalation emails and team invitations now use new template system
  - **Notification email helpers**: Pre-built functions for billing, integration, and usage notifications
  - **Customizable branding**: Support for custom colors and tenant-specific styling
  - **Email client compatibility**: Tested across Gmail, Outlook, Apple Mail, Yahoo, and Thunderbird
  - **Performance optimized**: Inline CSS, minimal images, semantic HTML for fast rendering
  - Files: src/lib/emails/templates/base.ts (core engine), src/lib/emails/templates/builders.ts (email builders), src/lib/emails/notification-sender.ts (notification helpers), src/lib/emails/team-invitation.ts (updated), src/lib/integrations/providers/email.ts (updated), src/lib/emails/demo.ts (examples), docs/development/email-templates.md (documentation)
- Site management (NEW - Phase 1 completed)
  - Multi-site registration and domain verification system for tenants
  - **Optional domain verification**: Users can skip verification during setup and complete it later for enhanced security
  - **Flexible workflow**: Site setup wizard allows progression through all steps without requiring immediate verification
  - **Skip verification benefits**: Users can delegate verification to team members or complete setup when verification isn't immediately possible
  - **Clear security indicators**: Unverified sites display appropriate warnings and status badges throughout the interface
  - **Verification reminders**: Strategic placement of verification benefits and calls-to-action for unverified sites
  - API routes: src/app/api/sites/route.ts, src/app/api/sites/[id]/route.ts, src/app/api/sites/[id]/verify/route.ts
  - Components: src/components/site-manager.tsx, src/components/site-selector.tsx, src/components/domain-verification.tsx, src/components/site-wizard-modal.tsx (updated)
  - Database: tenant_sites table with verification tokens and status tracking
  - Domain validation: Widget validates allowed origins per tenant (updated src/app/api/widget/route.ts)
  - Script key enforcement: Each site has a unique script_key returned by POST /api/sites; widget requires t (tenant public key) + s (site id) + k (site key), preventing cross-tenant snippet reuse
  - Onboarding Install step now generates site-specific embed code and includes a site selector
  - Site-specific content: Documents and chunks associated with specific tenant sites (updated src/app/api/ingest/route.ts)
- Onboarding experience (NEW - Phase 2 completed)
  - Complete 3-step onboarding flow: account setup → site registration → widget installation
  - **Flexible verification flow**: Domain verification is optional during setup, allowing users to complete wizard without delays
  - **Skip and continue**: Users can skip verification to delegate to team members or complete when convenient
  - **Security awareness**: Clear messaging about verification benefits with appropriate UI indicators for unverified sites
  - Pages: src/app/(pages)/onboarding/step-1/page.tsx, step-2/page.tsx, step-3/page.tsx
  - Components: src/components/onboarding-progress.tsx, src/components/onboarding-navigation.tsx
  - Features: Progress tracking, site registration with optional verification, live widget preview, installation guide
  - Layout: Custom onboarding layout with branded header and streamlined UX
  - Dashboard-embedded modal: Site onboarding wizard is available directly from the dashboard Quick Start banner and opens as a modal, not a separate page
    - Files: src/components/site-wizard-modal.tsx (modal with skip functionality), src/components/quickstart-actions.tsx (launcher), wired in src/app/dashboard/page.tsx
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
