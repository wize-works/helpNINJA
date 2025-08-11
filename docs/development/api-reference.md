# HelpNinja API Reference

Conventions
- All routes live under Next.js App Router. Export `runtime`:
	- `edge` for pure JS (no OpenAI/DB)
	- `nodejs` for DB/OpenAI/Stripe
- All JSON bodies use `content-type: application/json` unless noted.

## GET /api/widget (Edge)
Embeddable JS that renders the chat bubble and panel.
- Query: `?t=<tenantId>&voice=<friendly|formal>`
- Behavior: Persists `hn_sid` in localStorage; posts to `/api/chat`.

## POST /api/chat (Node)
Generates a concise AI answer using hybrid RAG and OpenAI, persists assistant message, may auto-escalate on low confidence.
Request:
```json
{ "tenantId": "abc123", "sessionId": "uuid", "message": "How do I...", "voice": "friendly" }
```
Response:
```json
{ "answer": "...", "refs": ["https://..."], "confidence": 0.7 }
```
Notes:
- Gates usage via `lib/usage.canSendMessage`; increments with `incMessages`.
- RAG: `lib/rag.searchHybrid` merges tsvector + pgvector.
- Auto-escalation threshold: 0.55.

## POST /api/escalate (Node)
Dispatches an escalation to configured integrations; falls back to env-based Slack/Email if none.
Request:
```json
{ "tenantId":"abc", "conversationId":"...", "sessionId":"...", "reason":"low_confidence", "userMessage":"...", "assistantAnswer":"...", "confidence":0.42, "refs":["https://..."] }
```
Response: `{ ok: true, results: [...] }` or `{ ok:false, error:"..." }`

## GET /api/integrations (Node)
List integrations for a tenant.
- Query: `?tenantId=abc`
Response: `[{ id, provider, name, status, credentials, config }]`

## POST /api/integrations (Node)
Create an integration record.
Request:
```json
{ "tenantId":"abc", "provider":"slack", "name":"Support Slack", "credentials":{ "webhook_url":"..." }, "config":{} }
```
Response: `{ id: "..." }`

## POST /api/ingest (Node)
Ingest a page or sitemap, chunk, embed, and store.
Request:
```json
{ "tenantId":"abc", "input":"https://example.com/sitemap.xml" }
```
Response: `{ ok:true, docs: 12 }`
Notes: Enforces site limits via `usage.canAddSite`.

## POST /api/billing/checkout (Node)
Creates a Stripe Checkout session for a plan.
Request: `{ "tenantId":"abc", "plan":"starter|pro|agency" }`
Response: `{ url:"https://checkout.stripe.com/..." }`

## POST /api/billing/portal (Node)
Creates a Stripe Billing Portal session for the tenant customer.
Request: `{ "tenantId":"abc" }` → `{ url:"https://billing.stripe.com/..." }`

## POST /api/stripe/webhook (Node)
Stripe webhook handling for subscription lifecycle.
- Must use raw body: `await req.text()` and `stripe.webhooks.constructEvent`.
- Updates `public.tenants` plan/status and ensures `usage_counters`.
