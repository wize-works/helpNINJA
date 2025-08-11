# HelpNinja Integration Playbook

Provider interface
- File: `src/lib/integrations/types.ts`
- Exported types: `ProviderKey`, `EscalationEvent`, `IntegrationRecord`, `Provider`
- Implement `sendEscalation(ev, integration)` and return `{ ok, id?, url?, error? }`

Registry & dispatch
- Register provider in `src/lib/integrations/registry.ts`
- Dispatch via `src/lib/integrations/dispatch.ts`
	- Loads active DB integrations; if none, builds env-based fallbacks (EMAIL/SLACK)
	- On failure, writes to `integration_outbox` with backoff fields

Adding a new provider
1) Create `src/lib/integrations/providers/<key>.ts` and export default `Provider`
2) Register in `registry.ts`
3) Store credentials/config in `public.integrations`
4) Test via a simple POST to `/api/escalate`

Env fallbacks
- Email: `SUPPORT_FALLBACK_TO_EMAIL`, `SUPPORT_FROM_EMAIL`, `RESEND_API_KEY`
- Slack: `SLACK_WEBHOOK_URL`

DB schema
- `integrations` table stores provider, credentials, config, status
- Failed sends persist to `integration_outbox` for async retry
