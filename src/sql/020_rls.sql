alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.tenant_members enable row level security;
alter table public.sources enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.events enable row level security;
alter table public.answers enable row level security;
alter table public.usage_counters enable row level security;

create policy tenant_members_select on public.tenant_members
for select using (true);

create policy tenant_data_select on public.documents
for select using (exists (
  select 1 from public.tenant_members tm
  where tm.tenant_id = documents.tenant_id and tm.user_id = auth.uid()
));

create policy tenant_data_mod on public.documents
for all using (exists (
  select 1 from public.tenant_members tm
  where tm.tenant_id = documents.tenant_id and tm.user_id = auth.uid()
));
