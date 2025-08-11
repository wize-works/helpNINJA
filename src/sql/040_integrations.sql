create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('email','slack','teams','freshdesk','zoho','zendesk','cherwell','jira')),
  name text not null,
  status text not null default 'active',
  credentials jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists integrations_tenant_idx on public.integrations(tenant_id);

create table if not exists public.escalation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  predicate jsonb not null default '{}'::jsonb,
  destinations jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists escalation_rules_tenant_idx on public.escalation_rules(tenant_id);

create table if not exists public.integration_outbox (
  id bigserial primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null,
  integration_id uuid references public.integrations(id) on delete set null,
  payload jsonb not null,
  status text not null default 'pending',
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists integration_outbox_pending on public.integration_outbox(status, next_attempt_at);
