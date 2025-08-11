import { query } from '@/lib/db';
import { PLAN_LIMITS } from './limits';

function firstOfMonth(): string { return new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString().slice(0, 10); }

export async function ensureUsageRow(tenantId: string) {
    await query(
        `insert into public.usage_counters (tenant_id, period_start, messages_count)
     values ($1, $2::date, 0)
     on conflict (tenant_id) do nothing`,
        [tenantId, firstOfMonth()]
    );
}

export async function resetIfNewMonth(tenantId: string) {
    const { rows } = await query<{ period_start: string }>('select period_start from public.usage_counters where tenant_id=$1', [tenantId]);
    if (!rows.length) return ensureUsageRow(tenantId);
    const ps = rows[0].period_start;
    const current = firstOfMonth();
    if (ps !== current) {
        await query('update public.usage_counters set period_start=$2::date, messages_count=0, last_reset=now() where tenant_id=$1', [tenantId, current]);
    }
}

export async function canSendMessage(tenantId: string): Promise<{ ok: boolean; reason?: string }> {
    const bypass = process.env.DISABLE_USAGE_LIMITS === '1' || process.env.DISABLE_USAGE_LIMITS === 'true';
    if (bypass) return { ok: true };
    const t = await query<{ plan: string; plan_status: string }>('select plan, plan_status from public.tenants where id=$1', [tenantId]);
    if (!t.rows.length) return { ok: false, reason: 'tenant not found' };
    const plan = (t.rows[0].plan || 'starter') as keyof typeof PLAN_LIMITS;
    await resetIfNewMonth(tenantId);
    const u = await query<{ messages_count: number }>('select messages_count from public.usage_counters where tenant_id=$1', [tenantId]);
    const used = u.rows[0]?.messages_count ?? 0;
    const limit = PLAN_LIMITS[plan].messages;
    if (used >= limit) return { ok: false, reason: 'message limit reached' };
    return { ok: true };
}

export async function incMessages(tenantId: string) {
    await query('update public.usage_counters set messages_count = messages_count + 1 where tenant_id=$1', [tenantId]);
}

export async function canAddSite(tenantId: string, hostToAdd: string): Promise<{ ok: boolean; reason?: string; current?: number; limit?: number; host?: string }> {
    const bypass = process.env.DISABLE_USAGE_LIMITS === '1' || process.env.DISABLE_USAGE_LIMITS === 'true';
    if (bypass) return { ok: true };
    const t = await query<{ plan: string }>('select plan from public.tenants where id=$1', [tenantId]);
    if (!t.rows.length) return { ok: false, reason: 'tenant not found' };
    const plan = (t.rows[0].plan || 'starter') as keyof typeof PLAN_LIMITS;
    const { rows } = await query<{ cnt: number }>(
        `select count(distinct split_part(replace(replace(url,'https://',''),'http://',''), '/', 1)) as cnt
     from public.documents where tenant_id=$1`, [tenantId]
    );
    const current = Number(rows[0]?.cnt || 0);
    const existing = await query<{ h: string }>(
        `select distinct split_part(replace(replace(url,'https://',''),'http://',''), '/', 1) as h
     from public.documents where tenant_id=$1`, [tenantId]
    );
    const hosts = new Set(existing.rows.map(r => r.h));
    const willBe = hosts.has(hostToAdd) ? current : current + 1;
    const limit = PLAN_LIMITS[plan].sites;
    return willBe <= limit ? { ok: true } : { ok: false, reason: 'site limit reached', current, limit, host: hostToAdd };
}
