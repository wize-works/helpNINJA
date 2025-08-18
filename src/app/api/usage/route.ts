import { NextRequest, NextResponse } from 'next/server'
import { resolveTenantIdFromRequest } from '@/lib/auth'
import { query } from '@/lib/db'
import { PLAN_LIMITS } from '@/lib/limits'
import { ensureUsageRow, resetIfNewMonth } from '@/lib/usage'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
    let tenantId: string
    try {
        tenantId = await resolveTenantIdFromRequest(req, true)
    } catch {
        return NextResponse.json({ error: 'tenantId not resolved' }, { status: 400 })
    }

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
