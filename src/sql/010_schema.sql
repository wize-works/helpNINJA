create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  public_key text unique not null,
  secret_key text unique not null,
  plan text not null default 'starter',
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key,
  email text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_members (
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text not null default 'member',
  primary key (tenant_id, user_id)
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null check (kind in ('url', 'sitemap', 'pdf', 'manual')),
  url text,
  title text,
  status text not null default 'ready',
  last_crawled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null,
  url text,
  title text,
  content text not null,
  lang text default 'en',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  url text,
  content text not null,
  token_count int not null,
  embedding vector(3072) not null
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  confidence numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id bigserial primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  question text not null,
  answer text not null,
  tags text[] default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  period_start date not null,
  messages_count int not null default 0,
  last_reset timestamptz not null default now()
);

alter table public.documents add column if not exists tsv tsvector;
update public.documents set tsv = to_tsvector('english', coalesce(title,'') || ' ' || content);
create index if not exists documents_tsv_idx on public.documents using gin (tsv);
