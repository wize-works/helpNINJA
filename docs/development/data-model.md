# HelpNinja Data Model

Core tables (public schema)
- tenants
	- id uuid pk, name text, plan text, plan_status text, stripe_customer_id text, stripe_subscription_id text, current_period_end timestamptz, created_at timestamptz default now()
- conversations
	- id uuid pk, tenant_id uuid fk tenants, session_id text, created_at timestamptz default now()
- messages
	- id uuid pk, conversation_id uuid fk conversations, tenant_id uuid fk tenants, role text ('user'|'assistant'|'system'), content text, confidence float8 null, created_at timestamptz default now()
- documents
	- id uuid pk, tenant_id uuid fk tenants, url text, title text, content text, tsv tsvector, created_at timestamptz default now()
- chunks
	- id uuid pk, tenant_id uuid fk tenants, document_id uuid fk documents, url text, content text, token_count int, embedding vector, created_at timestamptz default now()
- usage_counters
	- tenant_id uuid pk fk tenants, period_start date, messages_count int, last_reset timestamptz
- integrations
	- id uuid pk, tenant_id uuid fk tenants, provider text ('slack'|'email'|...), name text, status text ('active'|'disabled'), credentials jsonb, config jsonb, created_at timestamptz default now()
- integration_outbox
	- id uuid pk, tenant_id uuid fk tenants, provider text, integration_id uuid null, payload jsonb, status text ('pending'|'sent'|'failed'), attempts int, next_attempt_at timestamptz, last_error text, created_at timestamptz default now()

Extensions & indexes
- pgvector for `chunks.embedding`
- tsvector for `documents.tsv` (english)
- Recommended: GIN on `documents.tsv`, ivfflat on `chunks.embedding` (with appropriate list size)

Notable fields/metrics
- messages.confidence is used to auto-escalate when < 0.55 in current period
- usage_counters.messages_count gates AI calls based on plan (see `lib/limits.ts`)

RLS
- Enforce tenant isolation across all multi-tenant tables (tenants, conversations, messages, documents, chunks, usage_counters, integrations, integration_outbox)
