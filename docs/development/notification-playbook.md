Current state (already implemented – don’t duplicate)
Event emitters: Webhook system dispatches conversation.started, message.sent, escalation.triggered, document.ingested (with delivery tracking + retry).
Rule engine: escalation/routing/notification rule types already evaluated in api/chat; notification rules currently piggy‑back on escalation pipeline (meta.isNotification).
Destinations: Slack + Email via integrations registry; “notification” rules just send external alerts (no in‑app feed).
Escalation service: unified dispatch + optional webhooks + outbox retry.
UI placeholder: Notification bell stub in titlebar.tsx (no feed, no badge). What’s missing: persistence of discrete notification objects, unread state, user scoping, preference center, real‑time push (SSE/websocket), throttling/dedup, digesting, admin vs member scoping, audit.
Goals for a first-class notification system
In‑app visibility: Badge + panel (per user + per tenant contexts).
Clear taxonomy: Differentiate informational vs action-required vs system (errors, billing).
Multi-channel policy: In-app (default) → external (Slack/Email) per rule/preferences.
Noise control: Dedup (same event key within window), rate limits, optional batching/daily digest.
Extensibility: Easy to add new event types without touching core dispatch logic.
Observability: Query who was notified, read receipts, delivery status (internal vs external).
Security & tenancy: Hard tenant isolation; user-level read permissions.
Proposed event → notification layering
Event (domain) → Webhook (external) OR NotificationTrigger (internal) → Notification records (one per recipient or aggregated) → Delivery adapters (in-app, Slack, email).

Event taxonomy (initial)
Chat & Escalation: escalation.triggered, notification.rule_match, routing.rule_match
Content: document.ingested (success/failure), large ingestion errors
Integrations: integration.failed, integration.recovered, outbox.retry_exhausted
Billing: plan.trial_expiring (T-3 days), plan.payment_failed, plan.upgraded/downgraded
System: usage.threshold_80, usage.threshold_100 (hard stop), site.verification_failed/success Keep existing webhook names; add internal-only ones if not needed externally.
Data model (new tables)
notifications

id (uuid), tenant_id, type (enum), severity (info|warning|error|success|critical)
title, body (short markdown/plain), meta jsonb (deep link refs)
event_key (for dedup e.g. integration_failed:slack:XYZ), source (system|rule|webhook)
created_at, expires_at (nullable), group_key (for collapsible series) notification_recipients
notification_id, user_id (nullable if broadcast), read_at, delivered_channels text[] notification_preferences
user_id, tenant_id, channel (in_app|email|slack), type (or wildcard), enabled, throttle_window_secs (Reuse existing integrations/email infra for outbound; no need for new channel tables.)
Generation flow
Domain code (or existing services) emits a canonical internal event through a lightweight emitter (publishNotificationEvent({...})).
Notification service:
Maps event → template (title/body/severity/default channels).
Builds event_key; checks recent (e.g. same key inside 10m) to suppress or group.
Inserts notification + recipient rows (all active tenant members unless scoped).
Dispatches async fan-out to external channels only if:
Rule-based (existing notification rules) OR user preference for that type/channel.
In-app feed queries notifications join recipients filtered by user_id OR broadcast (user_id null) and unread.
UI (MVP)
Bell component:
GET /api/notifications/unread-count (cheap COUNT on notification_recipients where read_at IS NULL).
Panel: GET /api/notifications?cursor=… (pagination, 20 per page, sorts newest).
Actions: mark all read (bulk update), mark single read (PATCH), optionally archive (future).
Row formatting: icon by severity, relative time, optional “View” CTA linking via meta.deep_link.
APIs (App Router routes)
POST /api/internal/notifications (secured – internal service key; mostly for system cron/ops) GET /api/notifications (list) GET /api/notifications/unread-count PATCH /api/notifications/:id/read POST /api/notifications/mark-all-read GET /api/notification-preferences PATCH /api/notification-preferences (upsert array)

Reuse existing auth resolution (strict tenant + Clerk user) for dashboard; reject widget contexts.

Real-time strategy
Phase 1: Poll unread count every 30–60s (ETag + If-None-Match for cache). Phase 2: Server-Sent Events channel /api/notifications/stream using Postgres LISTEN/NOTIFY or polling tail (runtime: nodejs). Phase 3 (optional): WebSocket if broader real-time features emerge.

Integration with current rule engine
Keep “notification” rule_type; instead of directly calling escalation service only, have the Chat route:
On rule match: call createNotification({ type: 'notification.rule_match', meta: { ruleId, … } })
Then (if destinations configured) still call escalation service for external channels.
Add meta.isNotification already present → drive a lower severity and avoid counting toward escalations metrics.
Noise & throttling
event_key + window: e.g., integration.failed for same integration not more than 1 per 15m; subsequent ones increment a counter in meta and update existing notification (PATCH body “… (x5)”).
Preferences throttle_window_secs overrides default.
Usage thresholds only fire once per billing period per threshold crossing.
Migration steps (MVP slice)
Create tables + enums (single migration).
Implement notification service module:
createNotification(event) with dedup logic
markRead(), markAllRead(), fetchFeed()
Add API routes (CRUD+list+preferences).
Wire into existing emit points (minimal):
After escalation handled (only if reason=low_confidence OR rule_match) → create severity=warning notification.
Outbox retry endpoint when failure persists → critical notification.
Add bell UI + basic panel.
Add polling hook + unread badge.
Docs: expand complete-features.md with Notifications (MVP) once implemented.

Progress (MVP build log)
- [x] Schema migration (063_notifications.sql) for notifications, recipients, preferences
- [x] Service layer (src/lib/notifications.ts) with create/list/unread/mark read/preferences
- [x] API endpoints: list, unread-count, mark read, mark all read, preferences, internal create
- [x] Escalation integration: automatic notification on escalation events
- [x] UI bell + feed panel
- [x] Polling hook & unread badge
- [x] Clerk user ID mapping fix (lazy create + mapping of Clerk external ID to internal users.id uuid in resolveUserAndTenant)
- [ ] Preference management UI
- [ ] Rule engine direct notification (notification.rule_match) hook (phase 2 – after feed UI)

Notes
- Dedup: event_key + optional window in createNotification; future improvement to update counters instead of suppress.
- Broadcast notifications currently snapshot existing members; future enhancement may create pseudo-recipient rows for new members on first fetch.
- Backfill: Use `node scripts/backfill-clerk-user-mapping.mjs` (with CLERK_SECRET_KEY) to eagerly create internal user UUID mappings; otherwise lazy mapping occurs on first authenticated request.

Future enhancements (defer)
Digest emails (daily/weekly rollups).
Per-rule custom notification templates.
Multi-tenant admin broadcast (system status).
Mobile push (if/when device tokens exist).
Analytics: notification interaction rates.
Reuse vs new (validation)
Reusing: escalation service (external delivery); existing rule evaluation; webhooks (no change); integrations registry.
New: persistence layer (notifications tables), recipient scoping, UI feed, preferences, internal event emitter.
Edge cases to handle early
Tenant with zero members: store but no recipients (allow later joiners to see? decide: mark broadcast so future members can read if within 7 days).
Deleting a user: cascade recipient rows (ON DELETE CASCADE).
Large burst (e.g., ingestion of many docs) — collapse via group_key (document.ingested successes batched: show one summary “25 documents ingested successfully”).
Privacy: ensure no user PII leaks into Slack/email unless allowed (template sanitize meta).
Minimal enum + type suggestions
NotificationType:

escalation.low_confidence
escalation.rule_match
notification.rule_match
integration.failed
integration.recovered
usage.near_limit
usage.over_limit
billing.payment_failed
billing.trial_expiring
document.ingest_failed
document.ingest_complete (batched) Severity mapping table; keep centralized.