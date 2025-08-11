import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { resolveTenantIdFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
    let tenantId: string
    try { tenantId = await resolveTenantIdFromRequest(req, true) } catch { return NextResponse.json([], { status: 200 }) }
    const { rows } = await query('select id, provider, name, status, credentials, config from public.integrations where tenant_id=$1 order by created_at desc', [tenantId])
    return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
    const body = await req.json() as { tenantId?: string; provider?: string; name?: string; credentials?: Record<string, unknown>; config?: Record<string, unknown> }
    const tid = body.tenantId || (await resolveTenantIdFromRequest(req, true))
    const { provider, name } = body
    if (!tid || !provider || !name) return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    const { rows } = await query('insert into public.integrations (tenant_id, provider, name, credentials, config) values ($1,$2,$3,$4,$5) returning id', [tid, provider, name, body.credentials || {}, body.config || {}])
    return NextResponse.json({ id: rows[0].id })
}
