## Events Tracking Implementation Plan

Status: Draft (planning)  
Owner: (assign)  
Last updated: 2025-08-27

### 1. Overview
The existing `public.events` table (id, tenant_id, name, data jsonb, created_at) was scaffolded but is currently unused. We will operationalize it as a multi‑purpose, low‑overhead telemetry & audit feed for tenant‑scoped business and product events.

### 2. Goals
1. Central analytics feed (conversation volume, deflection, escalations, ingestion throughput, plan changes).
2. Lightweight debugging/audit trail with contextual JSON payloads.
3. Extensible event taxonomy without schema churn.
4. Foundation for future dashboards & usage insights (retention, feature adoption, conversion funnels).

### 3. Non‑Goals / Out of Scope (for MVP)
- Real‑time streaming to external warehouses (future: webhook fanout or CDC).
- PII scrubbing pipeline (assume payloads curated; add guidelines instead).
- User‑level behavioral analytics beyond defined core events.
- Aggregation materialized views (may add later if performance requires).

### 4. Event Taxonomy (Initial Set)
| Domain | Event Name | Required Data Keys | Purpose |
|--------|------------|--------------------|---------|
| Conversation | conversation_started | sessionId, conversationId | Count new conversations, session mapping |
| Conversation | message_sent | conversationId, role (user|assistant), confidence? | Fine‑grained volume / deflection (optional) |
| Escalation | escalation_triggered | conversationId, reason, integrationId? | Measure escalation rate / channel effectiveness |
| Billing | plan_updated | previousPlan, newPlan, status | Track upgrades/downgrades, churn |
| Billing | checkout_completed | plan, stripeSessionId | Conversion funnel |
| Ingestion | ingest_started | sourceType, url | Throughput & latency measurement (paired with ingest_completed) |
| Ingestion | ingest_completed | sourceType, url, docs, chunks | Success metrics |
| Ingestion | ingest_failed | sourceType, url, errorCode | Error tracking |
| Integrations | integration_failed | integrationId, type, errorCode | Reliability insights |
| Integrations | integration_succeeded | integrationId, type | Success rate |
| Limits | quota_exceeded | quotaType, limit, attempted | Usage friction signal |

Guidelines: keep payloads <2KB; no raw user PII; prefer id references.

### 5. Data Model Enhancements
Current DDL (simplified):
```
create table if not exists public.events (
  id bigserial primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  data jsonb,
  created_at timestamptz not null default now()
);
```
Planned additions:
- Index (tenant_id, name, created_at DESC) for filtered time series queries.
- Index (tenant_id, created_at DESC) for recent activity feeds.
- (Optional later) Partial index for high‑volume events if needed.

### 6. Security / RLS Policies
RLS currently enabled but no explicit policies. Strategy:
- Write access: service role / backend only.
- Read access: future admin dashboards (internal) – add a policy once auth model matures.
MVP: implement simple policy allowing service role insert; restrict select except service role. (If using Supabase, rely on service key for server inserts.)

### 7. Insertion Helper
Add `logEvent(tenantId: string, name: EventName, data?: Record<string, any>)` in `src/lib/events.ts`:
- Validates `name` against allowed set (enum) for consistency (can allow wildcard extension behind a feature flag later).
- Strips undefined values; enforces JSON serialization safety.
- Performs parameterized insert.

### 8. Instrumentation Points
| Location | Hook | Event(s) | Notes |
|----------|------|----------|-------|
| `api/chat` conversation bootstrap | After new conversation row insert | conversation_started | Include sessionId, conversationId |
| `api/chat` each message (optional MVP?) | After persist message | message_sent | Gate to avoid cost explosion; maybe only user role or summary sampling |
| `lib/escalation-service.ts` | On successful escalation trigger | escalation_triggered | reason, integrationId (if any) |
| `api/stripe/webhook` | On relevant Stripe events (checkout.session.completed, customer.subscription.updated) | checkout_completed / plan_updated | Map & normalize plan/status |
| `api/ingest` | At start & end & error catch | ingest_started / ingest_completed / ingest_failed | Capture counts; avoid full text bodies |
| Integration dispatcher | On failure / success | integration_failed / integration_succeeded | Already have outbox; piggyback event log |
| Usage limiter (`lib/usage.ts`) | On quota rejection | quota_exceeded | Identify quota friction |

### 9. Analytics Query Starters
Examples (for later dashboards):
```
-- Conversations per day
select date_trunc('day', created_at) d, count(*)
from public.events
where tenant_id = $1 and name = 'conversation_started'
group by 1 order by 1 desc limit 30;

-- Escalation rate
with conv as (
  select count(*) c from public.events where tenant_id=$1 and name='conversation_started' and created_at >= now()-interval '30 days'
), esc as (
  select count(*) e from public.events where tenant_id=$1 and name='escalation_triggered' and created_at >= now()-interval '30 days'
)
select e::float / nullif(c,0) escalation_rate from conv, esc;
```

### 10. Performance Considerations
- Estimated volume (initial): a few dozen events per tenant per day; low risk.
- Append‑only; table bloat manageable. Revisit partitioning when >50M rows.
- Consider log sampling for high‑frequency events (`message_sent`).

### 11. Implementation Tasks & Progress
Legend: [ ] TODO  [~] In Progress  [x] Done

Schema & Indexes
- [x] Migration: add composite index (tenant_id, name, created_at desc)
- [x] Migration: add index (tenant_id, created_at desc)
- [x] (Optional) Comment on table & columns for clarity

Security
- [ ] Define/confirm service role insert method (no public insert)
- [ ] Add explicit RLS policies (or document service-only usage)
- [ ] Write doc section on payload hygiene (PII, size)

Library
- [x] Create `src/lib/events.ts` with `logEvent`
- [x] Add TypeScript `EventName` union / enum
- [ ] Unit test for validation & insertion (mock db)

Instrumentation
- [x] conversation_started in `api/chat`
- [x] escalation_triggered in escalation service
- [x] plan_updated / checkout_completed in Stripe webhook route
- [x] ingest_started / ingest_completed / ingest_failed in ingestion route
- [x] integration_failed / integration_succeeded in integration dispatcher
- [x] quota_exceeded in usage limiter
- [ ] (Optional) message_sent sampling logic

Docs & Analytics
- [ ] Update `complete-features.md` when MVP shipped
- [x] Add example analytics queries doc (or section here) (partial done)
- [ ] Add dashboard spec (future)

QA / Verification
- [ ] Local manual test: trigger each event type & SELECT verify
- [ ] Performance smoke: bulk insert script (optional)
- [ ] Security review: ensure no user‑initiated path can forge events

Post‑MVP / Future
- Event streaming to webhooks / analytics sinks
- Materialized daily aggregates table for faster dashboards
- Cardinality/volume monitoring & auto‑sampling
- Redaction hooks for sensitive keys

### 12. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Payload bloat | Storage / query cost | Enforce size guideline & key allowlist later |
| Taxonomy drift | Inconsistent analytics | Central enum & review additions |
| Over‑instrumentation | Noise | Start lean; add sampling for chat messages |
| Sensitive data leakage | Compliance risk | Guidelines + later redaction pass |

### 13. Open Questions
- Do we need per‑user analytics soon (add user_id column)? (If yes, extend table early.)
- Do we prefer a UUID PK for sharding patterns? (Probably fine to keep bigserial for now.)
- Should we normalize some events into dedicated tables later (escalations already have a table)?

### 14. Next Immediate Steps (Proposed Sequence)
1. (Done) Add indexes + table comments migration.
2. (Done) Implement `logEvent` helper + enum.
3. (Done) Instrument conversation start & escalations first (highest immediate value).
4. (Done) Add Stripe + ingestion instrumentation.
5. (Done) Add remaining events (integration, quota) + doc progress updates.
6. Implement unit tests for `logEvent` & sampling logic.
7. Add aggregation queries / simple charts powered directly by events (optional).
8. Update `complete-features.md` once validated in staging.

---
This document will be updated as tasks move forward. When MVP tasks are all [x], mark this plan as Completed and summarize in `complete-features.md`.
