-- Option A: Inline Clerk IDs on core tables (idempotent)
-- Adds clerk_user_id to users and clerk_org_id to tenants

-- Users: Clerk user mapping
alter table public.users
  add column if not exists clerk_user_id text unique;

create index if not exists users_clerk_user_id_idx on public.users(clerk_user_id);

-- Tenants: Clerk organization mapping
alter table public.tenants
  add column if not exists clerk_org_id text unique;

create index if not exists tenants_clerk_org_id_idx on public.tenants(clerk_org_id);
