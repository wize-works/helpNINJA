alter table public.tenants
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan text not null default 'starter',
  add column if not exists plan_status text not null default 'inactive',
  add column if not exists current_period_end timestamptz;

insert into public.usage_counters (tenant_id, period_start, messages_count)
select t.id, date_trunc('month', now())::date, 0
from public.tenants t
left join public.usage_counters u on u.tenant_id = t.id
where u.tenant_id is null;
