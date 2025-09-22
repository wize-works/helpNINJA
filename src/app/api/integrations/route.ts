import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getTenantIdStrict } from '@/lib/tenant-resolve'
import { trackActivity } from '@/lib/activity-tracker'

export async function GET() {
    // Track user activity for integrations viewing
    await trackActivity();

    const tenantId = await getTenantIdStrict()
    const { rows } = await query('select id, provider, name, status, credentials, config from public.integrations where tenant_id=$1 order by created_at desc', [tenantId])
    return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
    // Track user activity for integration creation
    await trackActivity();

    const body = await req.json() as { provider?: string; name?: string; credentials?: Record<string, unknown>; config?: Record<string, unknown> }
    const tid = await getTenantIdStrict()
    const { provider, name } = body
    if (!tid || !provider || !name) return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    const { rows } = await query('insert into public.integrations (tenant_id, provider, name, credentials, config) values ($1,$2,$3,$4,$5) returning id', [tid, provider, name, body.credentials || {}, body.config || {}])
    return NextResponse.json({ id: rows[0].id })
}
