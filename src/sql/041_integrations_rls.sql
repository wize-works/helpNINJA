alter table public.integrations enable row level security;
alter table public.escalation_rules enable row level security;
alter table public.integration_outbox enable row level security;

create policy integrations_tenant on public.integrations
  for all using (exists (select 1 from public.tenant_members tm where tm.tenant_id = integrations.tenant_id and tm.user_id = auth.uid()));

create policy rules_tenant on public.escalation_rules
  for all using (exists (select 1 from public.tenant_members tm where tm.tenant_id = escalation_rules.tenant_id and tm.user_id = auth.uid()));

create policy outbox_tenant on public.integration_outbox
  for all using (exists (select 1 from public.tenant_members tm where tm.tenant_id = integration_outbox.tenant_id and tm.user_id = auth.uid()));
