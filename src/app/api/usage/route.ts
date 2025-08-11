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

    await ensureUsageRow(tenantId)
    await resetIfNewMonth(tenantId)

    const t = await query<{ plan: keyof typeof PLAN_LIMITS }>('select plan from public.tenants where id=$1', [tenantId])
    const planKey = (t.rows[0]?.plan || 'starter') as keyof typeof PLAN_LIMITS
    const limit = PLAN_LIMITS[planKey].messages
    const u = await query<{ messages_count: number }>('select messages_count from public.usage_counters where tenant_id=$1', [tenantId])
    const used = u.rows[0]?.messages_count ?? 0

    return NextResponse.json({ tenantId, plan: planKey, used, limit })
}
