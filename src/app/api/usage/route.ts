import { NextResponse } from 'next/server'
import { getTenantIdStrict } from '@/lib/tenant-resolve'
import { query } from '@/lib/db'
import { PLAN_LIMITS } from '@/lib/limits'
import { ensureUsageRow, resetIfNewMonth } from '@/lib/usage'
import { trackActivity } from '@/lib/activity-tracker'

export const runtime = 'nodejs'

export async function GET() {
    // Track user activity for usage viewing
    await trackActivity();

    const tenantId = await getTenantIdStrict()

    // Ensure counters exist for other flows, but we derive display usage from messages for UTC month alignment
    await ensureUsageRow(tenantId)
    await resetIfNewMonth(tenantId)

    const t = await query<{ plan: keyof typeof PLAN_LIMITS }>('select plan from public.tenants where id=$1', [tenantId])
    const planKey = (t.rows[0]?.plan || 'none') as keyof typeof PLAN_LIMITS
    const limit = PLAN_LIMITS[planKey].messages
    // Derive used from user messages during the current UTC calendar month to align with dashboard
    const usedQ = await query<{ used: number }>(
        `select count(*)::int as used
         from public.messages
         where tenant_id=$1
           and role='user'
           and (created_at at time zone 'UTC') >= date_trunc('month', (now() at time zone 'UTC'))`,
        [tenantId]
    )
    const used = usedQ.rows[0]?.used ?? 0

    return NextResponse.json({ tenantId, plan: planKey, used, limit })
}
